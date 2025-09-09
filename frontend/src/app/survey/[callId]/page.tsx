'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { StarIcon } from '@heroicons/react/24/solid';
import { message } from 'antd';

export default function SurveyPage() {
  const params = useParams();
  const callId = params.callId as string;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      message.error('Please select a rating.');
      return;
    }
    // Here you would typically send the survey data to your backend
    console.log({ callId, rating, comment });
    message.success('Thank you for your feedback!');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Thank You!</h1>
          <p className="mt-2 text-gray-600">Your feedback has been submitted successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Rate Your Experience</h1>
        <p className="text-center text-gray-600 mt-2">Call ID: {callId}</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-center mb-2">Overall Satisfaction</label>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map(star => (
                <StarIcon 
                  key={star}
                  onClick={() => setRating(star)}
                  className={`h-10 w-10 cursor-pointer ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700">Comments</label>
            <textarea 
              id="comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Tell us more about your experience..."
            />
          </div>
          <div>
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
