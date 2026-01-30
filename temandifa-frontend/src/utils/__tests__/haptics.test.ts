import { haptics } from "../haptics";
import * as Haptics from "expo-haptics";

// Mock Expo Haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

describe("haptics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should trigger light impact", async () => {
    await haptics.light();
    expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
  });

  it("should trigger medium impact", async () => {
    await haptics.medium();
    expect(Haptics.impactAsync).toHaveBeenCalledWith("medium");
  });

  it("should trigger heavy impact", async () => {
    await haptics.heavy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith("heavy");
  });

  it("should trigger success notification", async () => {
    await haptics.success();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
  });

  it("should trigger warning notification", async () => {
    await haptics.warning();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("warning");
  });

  it("should trigger error notification", async () => {
    await haptics.error();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("error");
  });

  it("should trigger selection feedback", async () => {
    await haptics.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it("should handle error when haptics fail (e.g. unavailable)", async () => {
    (Haptics.impactAsync as jest.Mock).mockRejectedValue(
      new Error("Unavailable")
    );
    await haptics.light();
    // Should not throw
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });
});
