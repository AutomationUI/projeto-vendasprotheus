import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../hooks/use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("should debounce value updates", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    expect(result.current).toBe("a"); // Still old value

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("ab"); // Updated after delay
  });

  it("should cancel previous timer on rapid updates", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    rerender({ value: "abc" });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("abc"); // Only last value
  });

  it("should respect custom delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "start" } }
    );

    rerender({ value: "end" });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe("start"); // Not yet

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("end"); // Now
  });
});
