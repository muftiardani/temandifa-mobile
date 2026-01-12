"""
Model Quantization Script for ONNX Models.
Converts FP32 ONNX models to INT8 for faster inference.
"""

import argparse
import os
import sys

try:
    import onnx
    from onnxruntime.quantization import QuantType, quantize_dynamic
except ImportError:
    print("Error: Required packages not installed.")
    print("Install with: pip install onnx onnxruntime")
    sys.exit(1)
    print("Error: Required packages not installed.")
    print("Install with: pip install onnx onnxruntime")
    sys.exit(1)


def validate_onnx_model(model_path: str) -> bool:
    """Validate ONNX model before quantization."""
    try:
        model = onnx.load(model_path)
        onnx.checker.check_model(model)
        print(f"✓ Model validation passed: {model_path}")
        return True
    except Exception as e:
        print(f"✗ Model validation failed: {e}")
        return False


def get_model_info(model_path: str) -> dict:
    """Get model information."""
    model = onnx.load(model_path)
    
    # Get input/output info
    inputs = []
    for inp in model.graph.input:
        shape = [
            d.dim_value if d.dim_value else "dynamic"
            for d in inp.type.tensor_type.shape.dim
        ]
        inputs.append({"name": inp.name, "shape": shape})
    
    outputs = []
    for out in model.graph.output:
        shape = [
            d.dim_value if d.dim_value else "dynamic"
            for d in out.type.tensor_type.shape.dim
        ]
        outputs.append({"name": out.name, "shape": shape})
    
    return {
        "inputs": inputs,
        "outputs": outputs,
        "nodes": len(model.graph.node),
        "opset_version": (
            model.opset_import[0].version if model.opset_import else "unknown"
        ),
    }


def quantize_model_dynamic(
    input_path: str,
    output_path: str,
    weight_type: str = "uint8",
    per_channel: bool = True,
    reduce_range: bool = True,
    optimize_model: bool = True,
) -> bool:
    """
    Perform dynamic quantization on an ONNX model.
    
    Dynamic quantization quantizes weights to INT8 and activations are
    quantized dynamically at runtime.
    
    Args:
        input_path: Path to input FP32 ONNX model
        output_path: Path for output quantized model
        weight_type: Weight type - "uint8" or "int8"
        per_channel: Use per-channel quantization for better accuracy
        reduce_range: Use 7-bit quantization for better compatibility
        optimize_model: Apply graph optimizations before quantization
        
    Returns:
        True if successful, False otherwise
    """
    print(f"\n{'='*60}")
    print("ONNX Model Dynamic Quantization")
    print(f"{'='*60}")
    print(f"Input:  {input_path}")
    print(f"Output: {output_path}")
    print(f"{'='*60}\n")
    
    # Validate input model
    if not os.path.exists(input_path):
        print(f"✗ Error: Input model not found: {input_path}")
        return False
    
    if not validate_onnx_model(input_path):
        return False
    
    # Get model info
    print("\n📊 Model Information:")
    info = get_model_info(input_path)
    print(f"  - Nodes: {info['nodes']}")
    print(f"  - Opset: {info['opset_version']}")
    print(f"  - Inputs: {info['inputs']}")
    print(f"  - Outputs: {info['outputs']}")
    
    # Map weight type
    quant_type_map = {
        "uint8": QuantType.QUInt8,
        "int8": QuantType.QInt8,
    }
    quant_type = quant_type_map.get(weight_type.lower(), QuantType.QUInt8)
    
    print("\n⚙️  Quantization Settings:")
    print(f"  - Weight Type: {weight_type}")
    print(f"  - Per-Channel: {per_channel}")
    print(f"  - Reduce Range: {reduce_range}")
    print(f"  - Optimize: {optimize_model}")
    
    # Perform quantization
    print("\n🔄 Quantizing model...")
    try:
        quantize_dynamic(
            model_input=input_path,
            model_output=output_path,
            weight_type=quant_type,
            per_channel=per_channel,
            reduce_range=reduce_range,
            optimize_model=optimize_model,
        )
        
        # Validate output model
        if not validate_onnx_model(output_path):
            return False
        
        # Compare sizes
        input_size = os.path.getsize(input_path) / (1024 * 1024)
        output_size = os.path.getsize(output_path) / (1024 * 1024)
        reduction = (1 - output_size / input_size) * 100
        
        print("\n✅ Quantization completed successfully!")
        print("\n📦 Size Comparison:")
        print(f"  - Original:   {input_size:.2f} MB")
        print(f"  - Quantized:  {output_size:.2f} MB")
        print(f"  - Reduction:  {reduction:.1f}%")
        
        return True
        
    except Exception as e:
        print(f"✗ Quantization failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def quantize_yolo(models_dir: str = "models"):
    """Quantize YOLOv8 model specifically."""
    input_path = os.path.join(models_dir, "yolov8n.onnx")
    output_path = os.path.join(models_dir, "yolov8n_int8.onnx")
    
    # Check if PT model exists and ONNX doesn't
    pt_path = os.path.join(models_dir, "yolov8n.pt")
    if not os.path.exists(input_path) and os.path.exists(pt_path):
        print("⚠️  ONNX model not found. Please export from PyTorch first:")
        print(f"   yolo export model={pt_path} format=onnx")
        return False
    
    return quantize_model_dynamic(
        input_path=input_path,
        output_path=output_path,
        weight_type="uint8",
        per_channel=True,
        reduce_range=True,
    )


def main():
    parser = argparse.ArgumentParser(
        description="Quantize ONNX models to INT8",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Quantize YOLOv8 model
  python quantize_model.py --yolo
  
  # Quantize custom model
  python quantize_model.py -i model.onnx -o model_int8.onnx
  
  # Quantize with specific settings
  python quantize_model.py -i model.onnx -o model_int8.onnx \\\n      --weight-type int8 --no-per-channel
        """,
    )
    
    parser.add_argument("--yolo", action="store_true", help="Quantize YOLOv8 model")
    parser.add_argument("-i", "--input", type=str, help="Input ONNX model path")
    parser.add_argument("-o", "--output", type=str, help="Output quantized model path")
    parser.add_argument("--weight-type", choices=["uint8", "int8"], default="uint8")
    parser.add_argument("--no-per-channel", action="store_true")
    parser.add_argument("--no-reduce-range", action="store_true")
    parser.add_argument("--no-optimize", action="store_true")
    parser.add_argument("--models-dir", type=str, default="models")
    
    args = parser.parse_args()
    
    if args.yolo:
        success = quantize_yolo(args.models_dir)
    elif args.input and args.output:
        success = quantize_model_dynamic(
            input_path=args.input,
            output_path=args.output,
            weight_type=args.weight_type,
            per_channel=not args.no_per_channel,
            reduce_range=not args.no_reduce_range,
            optimize_model=not args.no_optimize,
        )
    else:
        parser.print_help()
        print("\n⚠️  Please specify --yolo or provide -i and -o paths")
        sys.exit(1)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
