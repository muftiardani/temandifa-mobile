import {
  optimizeImage,
  optimizeImageForOCR,
  optimizeImageForDetection,
} from "../imageUtils";
import * as ImageManipulator from "expo-image-manipulator";

// Mock Logger to avoid cluttering test output
jest.mock("../../services/logger", () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock ImageManipulator
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: "jpeg",
  },
}));

describe("imageUtils", () => {
  const mockUri = "file://test.jpg";
  const mockResult = {
    uri: "file://optimized.jpg",
    width: 800,
    height: 600,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
      mockResult
    );
  });

  describe("optimizeImage", () => {
    it("should call manipulateAsync with default options", async () => {
      const result = await optimizeImage(mockUri);

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: "jpeg" }
      );
      expect(result).toBe(mockResult.uri);
    });

    it("should call manipulateAsync with custom options", async () => {
      await optimizeImage(mockUri, { maxWidth: 500, quality: 0.5 });

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockUri,
        [{ resize: { width: 500 } }],
        { compress: 0.5, format: "jpeg" }
      );
    });

    it("should return original uri on failure", async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValue(
        new Error("Failed")
      );

      const result = await optimizeImage(mockUri);

      expect(result).toBe(mockUri);
    });
  });

  describe("optimizeImageForOCR", () => {
    it("should optimize with high quality settings", async () => {
      await optimizeImageForOCR(mockUri);

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockUri,
        [{ resize: { width: 1920 } }],
        { compress: 0.85, format: "jpeg" }
      );
    });
  });

  describe("optimizeImageForDetection", () => {
    it("should optimize with lower quality settings", async () => {
      await optimizeImageForDetection(mockUri);

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockUri,
        [{ resize: { width: 640 } }],
        { compress: 0.6, format: "jpeg" }
      );
    });
  });
});
