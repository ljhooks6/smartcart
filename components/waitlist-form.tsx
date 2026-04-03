"use client";

import { FormEvent, useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("https://formspree.io/f/mqegdoly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("There was a problem joining the waitlist. Please try again.");
      }

      setSubmitted(true);
      setEmail("");
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "There was a problem joining the waitlist. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-blue-100 bg-blue-50 p-6 text-center shadow-sm">
      <h3 className="font-display text-3xl text-gray-800">
        The Ultimate Grocery Map is Coming
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
        We are building an advanced routing engine to scan local store shelves and
        find the absolute cheapest places to buy your AI meal plan. Join the
        waitlist for early access.
      </p>

      {submitted ? (
        <div className="mt-5 inline-block rounded-xl bg-green-100 px-4 py-3 font-semibold text-green-700">
          You&apos;re on the list! We&apos;ll notify you when Phase 2 launches.
        </div>
      ) : (
        <form
          className="mx-auto mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row"
          onSubmit={handleSubmit}
        >
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-200 sm:w-72"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
            required
            type="email"
            value={email}
          />
          <button
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Joining..." : "Join Waitlist"}
          </button>
        </form>
      )}

      {submissionError ? (
        <p className="mt-4 text-sm font-medium text-red-600">{submissionError}</p>
      ) : null}
    </section>
  );
}
