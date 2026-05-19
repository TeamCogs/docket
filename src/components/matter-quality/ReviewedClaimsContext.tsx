"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ClaimId, ReviewedClaimsValue } from "./types";

export const ReviewedClaimsContext = createContext<ReviewedClaimsValue>({
  reviewed: new Set(),
  carried: new Set(),
  mark: () => {},
  unmark: () => {},
  toggle: () => {},
});

export function ReviewedClaimsProvider({
  children,
  initialReviewed = [],
  initialCarried = [],
}: {
  children: React.ReactNode;
  initialReviewed?: ClaimId[];
  initialCarried?: ClaimId[];
}) {
  const [reviewed, setReviewed] = useState<Set<ClaimId>>(() => new Set(initialReviewed));
  const carried = useMemo(() => new Set(initialCarried), []);

  const mark = useCallback((_id: ClaimId, _via?: "source_view" | "direct_toggle") => {
    setReviewed((prev) => {
      if (prev.has(_id)) return prev;
      const next = new Set(prev);
      next.add(_id);
      return next;
    });
  }, []);

  const unmark = useCallback((_id: ClaimId) => {
    setReviewed((prev) => {
      if (!prev.has(_id)) return prev;
      const next = new Set(prev);
      next.delete(_id);
      return next;
    });
  }, []);

  const toggle = useCallback((_id: ClaimId) => {
    setReviewed((prev) => {
      const next = new Set(prev);
      if (next.has(_id)) next.delete(_id);
      else next.add(_id);
      return next;
    });
  }, []);

  const value = useMemo<ReviewedClaimsValue>(
    () => ({ reviewed, carried, mark, unmark, toggle }),
    [reviewed, carried, mark, unmark, toggle],
  );

  return (
    <ReviewedClaimsContext.Provider value={value}>
      {children}
    </ReviewedClaimsContext.Provider>
  );
}

export function useReviewedClaims(): ReviewedClaimsValue {
  return useContext(ReviewedClaimsContext);
}
