"use client";

import Link from "next/link";
import { useLearner } from "@/components/LearnerProvider";

const SAMPLE_COURSE_ID = "course-microeconomics";
const SAMPLE_USER_ID = "user-amina";

export function isSampleCourse(courseId: string | undefined, userId?: string | null) {
  return courseId === SAMPLE_COURSE_ID || userId === SAMPLE_USER_ID;
}

/**
 * Reflective honesty (Norman): when the learner is in the sample world,
 * say so plainly so trust and self-attribution stay intact.
 */
export function SampleCourseBanner() {
  const { state } = useLearner();
  if (!state.onboardingCompleted) return null;
  const course = state.snapshot.courses[0];
  const userId = state.snapshot.profile?.id;
  if (!isSampleCourse(course?.id, userId)) return null;

  return (
    <aside className="sample-course-banner" role="status">
      <p>
        <strong>Sample course</strong>
        <span aria-hidden="true"> · </span>
        Exploring with a finished Microeconomics model — not your materials yet.{" "}
        <Link href="/materials">Add your own course</Link>
      </p>
    </aside>
  );
}
