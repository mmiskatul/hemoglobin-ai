"use client";

import React, { useState, useEffect } from "react";
import { BANGLADESH_LOCATIONS, getUnionsForUpazila } from "@/data/bangladeshLocations";

interface LocationSelectorProps {
  onLocationChange: (formattedLocation: string) => void;
  initialDivision?: string;
  initialDistrict?: string;
  initialUpazila?: string;
  initialUnion?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationChange,
  initialDivision = "Sylhet",
  initialDistrict = "Sylhet",
  initialUpazila = "Sylhet Sadar",
  initialUnion,
}) => {
  const [selectedDivision, setSelectedDivision] = useState(initialDivision);
  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict);
  const [selectedUpazila, setSelectedUpazila] = useState(initialUpazila);
  const [selectedUnion, setSelectedUnion] = useState(initialUnion || getUnionsForUpazila(initialUpazila)[0] || "");

  // Available districts for current division
  const currentDivisionObj = BANGLADESH_LOCATIONS.find((d) => d.name === selectedDivision) || BANGLADESH_LOCATIONS[0];
  const availableDistricts = currentDivisionObj.districts;

  // Available upazilas for current district
  const currentDistrictObj = availableDistricts.find((d) => d.name === selectedDistrict) || availableDistricts[0];
  const availableUpazilas = currentDistrictObj ? currentDistrictObj.upazilas : [];

  // Available unions for current upazila
  const availableUnions = getUnionsForUpazila(selectedUpazila);

  // When division changes, auto-select first district, upazila, and union
  const handleDivisionChange = (divName: string) => {
    setSelectedDivision(divName);
    const divObj = BANGLADESH_LOCATIONS.find((d) => d.name === divName) || BANGLADESH_LOCATIONS[0];
    const firstDist = divObj.districts[0];
    if (firstDist) {
      setSelectedDistrict(firstDist.name);
      const firstUpz = firstDist.upazilas[0] || firstDist.name;
      setSelectedUpazila(firstUpz);
      const unions = getUnionsForUpazila(firstUpz);
      if (unions.length > 0) setSelectedUnion(unions[0]);
    }
  };

  // When district changes, auto-select first upazila and union
  const handleDistrictChange = (distName: string) => {
    setSelectedDistrict(distName);
    const distObj = availableDistricts.find((d) => d.name === distName);
    if (distObj && distObj.upazilas.length > 0) {
      const firstUpz = distObj.upazilas[0];
      setSelectedUpazila(firstUpz);
      const unions = getUnionsForUpazila(firstUpz);
      if (unions.length > 0) setSelectedUnion(unions[0]);
    }
  };

  // When upazila changes, auto-select first union
  const handleUpazilaChange = (upazilaName: string) => {
    setSelectedUpazila(upazilaName);
    const unions = getUnionsForUpazila(upazilaName);
    if (unions.length > 0) {
      setSelectedUnion(unions[0]);
    }
  };

  useEffect(() => {
    const formatted = `${selectedUnion ? `${selectedUnion}, ` : ""}${selectedUpazila}, ${selectedDistrict}`;
    onLocationChange(formatted);
  }, [selectedDivision, selectedDistrict, selectedUpazila, selectedUnion, onLocationChange]);

  return (
    <div className="space-y-3 w-full">
      {/* 2-Column Grid: Division & District */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">Division</label>
          <select
            value={selectedDivision}
            onChange={(e) => handleDivisionChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
          >
            {BANGLADESH_LOCATIONS.map((div) => (
              <option key={div.name} value={div.name}>
                {div.name} Division
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">District</label>
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
          >
            {availableDistricts.map((dist) => (
              <option key={dist.name} value={dist.name}>
                {dist.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2-Column Grid: Upazila & Union/Ward */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">Upazila / Thana</label>
          <select
            value={selectedUpazila}
            onChange={(e) => handleUpazilaChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
          >
            {availableUpazilas.map((upazila) => (
              <option key={upazila} value={upazila}>
                {upazila}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">Union / Ward</label>
          <select
            value={selectedUnion}
            onChange={(e) => setSelectedUnion(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
          >
            {availableUnions.map((union) => (
              <option key={union} value={union}>
                {union}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
