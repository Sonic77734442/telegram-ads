// src/pages/CreateAd.jsx
import React from "react";

const CreateAd = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Create Your Ad</h1>
      <form className="grid gap-4">
        <input type="text" placeholder="Ad title" className="input" />
        <textarea placeholder="Ad text" className="input"></textarea>
        <input type="text" placeholder="URL to promote" className="input" />

        <label className="flex items-center gap-2">
          <input type="checkbox" /> Show picture
        </label>

        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Upload Photo or Video
        </button>

        <input type="number" placeholder="CPM in Ton" className="input" />
        <input
          type="number"
          placeholder="Initial Budget in Ton"
          className="input"
        />

        <label className="block font-semibold">Daily views limit per user:</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              className="border px-3 py-1 rounded hover:bg-gray-100"
            >
              {n}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <label>
            <input type="radio" name="status" /> Active
          </label>
          <label>
            <input type="radio" name="status" defaultChecked /> On Hold
          </label>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" /> Run this ad on schedule
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" /> I agree with terms
        </label>

        <button className="bg-blue-600 text-white px-6 py-2 rounded">
          Create Ad
        </button>
      </form>
    </div>
  );
};

export default CreateAd;