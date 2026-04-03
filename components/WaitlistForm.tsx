"use client";
import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const response = await fetch("https://formspree.io/f/mqegdoly", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: email })
    });

    if (response.ok) {
      setSubmitted(true);
    } else {
      alert("Oops! There was a problem joining the waitlist. Please try again.");
    }
  };

  return (
    <div className="p-6 mt-12 bg-blue-50 rounded-lg border border-blue-100 text-center shadow-sm w-full max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-2 text-gray-800">The Ultimate Grocery Map is Coming</h3>
      <p className="text-gray-600 mb-5 max-w-md mx-auto">
        We are building an advanced routing engine to scan local store shelves and find the absolute cheapest places to buy your AI meal plan. Join the waitlist for early access!
      </p>
      
      {submitted ? (
        <div className="text-green-700 font-bold p-3 bg-green-100 rounded-md inline-block">
          🎉 You&apos;re on the list! We&apos;ll notify you when Phase 2 launches.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row justify-center gap-3">
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address" 
            className="p-3 border border-gray-300 rounded-md w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            required 
          />
          <button 
            type="submit" 
            className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Join Waitlist
          </button>
        </form>
      )}
    </div>
  );
}
