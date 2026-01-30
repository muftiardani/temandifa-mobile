import React from "react";
import { render, screen } from "@testing-library/react-native";
import { View, Text } from "react-native";

test("smoke test - finding element", () => {
  render(
    <View>
      <Text>Hello Testing!</Text>
    </View>
  );
  expect(screen.getByText("Hello Testing!")).toBeTruthy();
});

test("basic math assertion", () => {
  expect(1 + 1).toBe(2);
});
