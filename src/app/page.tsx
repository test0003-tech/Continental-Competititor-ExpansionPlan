"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Target,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  TrendingUp,
  Map,
  CircleDot,
  Flame,
  Maximize,
  Minimize,
} from "lucide-react";
import type { Dealer, BrandStats, StateStats } from "@/lib/types";
import { BRAND_CONFIG } from "@/lib/types";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-3"></div>
        <p className="text-gray-400 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Dashboard() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(
    new Set(["continental"])
  );
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [showStateTable, setShowStateTable] = useState(true);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [mapMode, setMapMode] = useState<"dots" | "heatmap">("dots");
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.5, 78.9]);
  const [mapZoom, setMapZoom] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetch("/dealers.json")
      .then((r) => r.json())
      .then((data: Dealer[]) => {
        setDealers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleBrand = useCallback((brandKey: string) => {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brandKey)) {
        if (brandKey !== "continental" || next.size > 1) {
          next.delete(brandKey);
        }
      } else {
        next.add(brandKey);
      }
      return next;
    });
  }, []);

  const selectAllBrands = useCallback(() => {
    setSelectedBrands(new Set(Object.keys(BRAND_CONFIG)));
  }, []);

  const clearAllBrands = useCallback(() => {
    setSelectedBrands(new Set(["continental"]));
  }, []);

  const states = useMemo(() => {
    const s = new Set(dealers.map((d) => d.state).filter(Boolean));
    return Array.from(s).sort();
  }, [dealers]);

  const cities = useMemo(() => {
    if (selectedState === "all") return [];
    const c = new Set(
      dealers
        .filter((d) => d.state === selectedState)
        .map((d) => d.city)
        .filter(Boolean)
    );
    return Array.from(c).sort();
  }, [dealers, selectedState]);

  const handleStateSelect = useCallback(
    (state: string) => {
      setSelectedState(state);
      setSelectedCity("all");
      if (state !== "all") {
        const stateDealers = dealers.filter(
          (d) => d.state === state && d.brandKey === "continental"
        );
        if (stateDealers.length > 0) {
          const avgLat =
            stateDealers.reduce((s, d) => s + d.lat, 0) / stateDealers.length;
          const avgLng =
            stateDealers.reduce((s, d) => s + d.lng, 0) / stateDealers.length;
          setMapCenter([avgLat, avgLng]);
          setMapZoom(7);
        }
      } else {
        setMapCenter([22.5, 78.9]);
        setMapZoom(5);
      }
    },
    [dealers]
  );

  const filteredDealers = useMemo(() => {
    let result = dealers.filter((d) => selectedBrands.has(d.brandKey));
    if (selectedState !== "all") {
      result = result.filter((d) => d.state === selectedState);
    }
    if (selectedCity !== "all") {
      result = result.filter((d) => d.city === selectedCity);
    }
    return result;
  }, [dealers, selectedBrands, selectedState, selectedCity]);

  const continentalDealers = useMemo(
    () => filteredDealers.filter((d) => d.brandKey === "continental"),
    [filteredDealers]
  );

  const competitorDealers = useMemo(
    () => filteredDealers.filter((d) => d.brandKey !== "continental"),
    [filteredDealers]
  );

  const brandStats: BrandStats[] = useMemo(() => {
    const stats: Record<string, BrandStats> = {};
    for (const d of filteredDealers) {
      if (!stats[d.brandKey]) {
        stats[d.brandKey] = {
          brand: d.brand,
          brandKey: d.brandKey,
          color: d.color,
          count: 0,
          states: 0,
          cities: 0,
        };
      }
      stats[d.brandKey].count++;
    }
    for (const key of Object.keys(stats)) {
      const brandDealers = filteredDealers.filter((d) => d.brandKey === key);
      stats[key].states = new Set(brandDealers.map((d) => d.state)).size;
      stats[key].cities = new Set(brandDealers.map((d) => d.city)).size;
    }
    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [filteredDealers]);

  const stateStats: StateStats[] = useMemo(() => {
    const stateMap: Record<string, StateStats> = {};
    for (const d of filteredDealers) {
      if (!d.state) continue;
      if (!stateMap[d.state]) {
        stateMap[d.state] = {
          state: d.state,
          total: 0,
          continental: 0,
          competitors: 0,
          brands: {},
        };
      }
      stateMap[d.state].total++;
      if (d.brandKey === "continental") {
        stateMap[d.state].continental++;
      } else {
        stateMap[d.state].competitors++;
      }
      stateMap[d.state].brands[d.brand] =
        (stateMap[d.state].brands[d.brand] || 0) + 1;
    }
    return Object.values(stateMap).sort((a, b) => b.continental - a.continental);
  }, [filteredDealers]);

  const continentalStates = useMemo(
    () =>
      new Set(
        dealers
          .filter((d) => d.brandKey === "continental")
          .map((d) => d.state)
      ),
    [dealers]
  );

  const handleCitySelect = useCallback(
    (city: string) => {
      setSelectedCity(city);
      if (city !== "all") {
        const cityDealers = dealers.filter((d) => d.city === city);
        if (cityDealers.length > 0) {
          const avgLat =
            cityDealers.reduce((s, d) => s + d.lat, 0) / cityDealers.length;
          const avgLng =
            cityDealers.reduce((s, d) => s + d.lng, 0) / cityDealers.length;
          setMapCenter([avgLat, avgLng]);
          setMapZoom(11);
        }
      }
    },
    [dealers]
  );

  const continentalMarketShare = useMemo(() => {
    const total = filteredDealers.length;
    if (total === 0) return "0";
    return ((continentalDealers.length / total) * 100).toFixed(1);
  }, [filteredDealers, continentalDealers]);

  const totalBrandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of dealers) {
      counts[d.brandKey] = (counts[d.brandKey] || 0) + 1;
    }
    return counts;
  }, [dealers]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg font-medium">
            Loading Continental Competitor Analysis...
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Processing 13,500+ dealer locations
          </p>
        </div>
      </div>
    );
  }

  const maxStatCount = brandStats.length > 0 ? brandStats[0].count : 1;

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <header className="dashboard-header bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white shadow-lg shadow-black/50 shrink-0 border-b border-white/5">
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shrink-0 shadow-lg shadow-yellow-500/20">
              <Target className="w-4 h-4 text-gray-900" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate text-white">
                CONTINENTAL TIRE — Competitor Analysis
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                Dealer mapping across India • {dealers.length.toLocaleString()} dealers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Location Filters in Header */}
            <div className="hidden md:flex items-center gap-2">
              <Select value={selectedState} onValueChange={handleStateSelect}>
                <SelectTrigger className="h-7 w-44 text-xs bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 focus:ring-yellow-500/30">
                  <SelectValue placeholder="All States & UTs" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all" className="text-gray-300 focus:bg-gray-800 focus:text-white">All India</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s} value={s} className="text-gray-300 focus:bg-gray-800 focus:text-white">
                      {s}
                      {continentalStates.has(s) && (
                        <span className="ml-1 text-yellow-500">●</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedState !== "all" && cities.length > 0 && (
                <Select value={selectedCity} onValueChange={handleCitySelect}>
                  <SelectTrigger className="h-7 w-36 text-xs bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 focus:ring-yellow-500/30">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="all" className="text-gray-300 focus:bg-gray-800 focus:text-white">All Cities</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c} className="text-gray-300 focus:bg-gray-800 focus:text-white">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {/* Map Mode Toggle */}
            <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5">
              <button
                onClick={() => setMapMode("dots")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${
                  mapMode === "dots"
                    ? "bg-yellow-500/20 text-yellow-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <CircleDot className="w-3 h-3" />
                <span className="hidden sm:inline">Dots</span>
              </button>
              <button
                onClick={() => setMapMode("heatmap")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${
                  mapMode === "heatmap"
                    ? "bg-orange-500/20 text-orange-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Flame className="w-3 h-3" />
                <span className="hidden sm:inline">Heatmap</span>
              </button>
            </div>
            {/* Mobile filter button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
              onClick={() => setMobileFilters(true)}
            >
              <Map className="w-4 h-4" />
            </Button>
            <Badge
              variant="outline"
              className="border-yellow-500/30 text-yellow-400 text-[10px] px-1.5 bg-yellow-500/5"
            >
              <MapPin className="w-2.5 h-2.5 mr-0.5" />
              {continentalDealers.length} Continental
            </Badge>
            <Badge
              variant="outline"
              className="border-gray-600/30 text-gray-400 text-[10px] px-1.5 bg-white/5 hidden sm:inline-flex"
            >
              {competitorDealers.length.toLocaleString()} Competitors
            </Badge>
          </div>
        </div>
      </header>

      {/* Mobile Location Filter Drawer */}
      {mobileFilters && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            onClick={() => setMobileFilters(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-72 bg-gray-950 border-l border-white/10 shadow-2xl z-[70] lg:hidden flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <span className="text-sm font-semibold text-gray-200">Filters</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                onClick={() => setMobileFilters(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">State / UT</label>
                <Select value={selectedState} onValueChange={(v) => { handleStateSelect(v); }}>
                  <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-gray-300">
                    <SelectValue placeholder="All States & UTs" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="all" className="text-gray-300">All India</SelectItem>
                    {states.map((s) => (
                      <SelectItem key={s} value={s} className="text-gray-300">
                        {s}
                        {continentalStates.has(s) && (
                          <span className="ml-1 text-yellow-500">●</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedState !== "all" && cities.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">City</label>
                  <Select value={selectedCity} onValueChange={handleCitySelect}>
                    <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-gray-300">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="all" className="text-gray-300">All Cities</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c} className="text-gray-300">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {/* Quick Stats on Mobile */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-yellow-500/10 rounded-lg p-3 text-center border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">{continentalDealers.length}</div>
                  <div className="text-[10px] text-yellow-500/80 uppercase tracking-wider font-medium">Continental</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                  <div className="text-2xl font-bold text-gray-300">{competitorDealers.length.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Competitors</div>
                </div>
                <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/20">
                  <div className="text-2xl font-bold text-emerald-400">{continentalMarketShare}%</div>
                  <div className="text-[10px] text-emerald-500/80 uppercase tracking-wider font-medium">Market Share</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-400">{new Set(continentalDealers.map((d) => d.state)).size}</div>
                  <div className="text-[10px] text-blue-500/80 uppercase tracking-wider font-medium">States & UTs</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Brand Selection Cards Strip */}
      <div className="bg-gray-950 border-b border-white/5 shrink-0 dashboard-header" style={{ zIndex: 40 }}>
        <div className="px-3 py-2.5">
          {/* Top row: label + actions */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Select Brands
              </h2>
              {/* Quick Stats pills - desktop */}
              <div className="hidden lg:flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">
                  <Users className="w-3 h-3" />
                  {continentalDealers.length} Continental
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                  {competitorDealers.length.toLocaleString()} Competitors
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {continentalMarketShare}% Share
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                  <MapPin className="w-3 h-3" />
                  {new Set(continentalDealers.map((d) => d.state)).size} States & UTs
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-gray-500 hover:text-gray-300 border border-white/10 rounded-md hover:bg-white/5"
                onClick={selectAllBrands}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-gray-500 hover:text-gray-300 border border-white/10 rounded-md hover:bg-white/5"
                onClick={clearAllBrands}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Brand Cards Row */}
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar-dark">
            {Object.entries(BRAND_CONFIG)
              .sort(([, a], [, b]) => a.priority - b.priority)
              .map(([key, config]) => {
                const isSelected = selectedBrands.has(key);
                const stat = brandStats.find((s) => s.brandKey === key);
                const count = stat?.count || 0;
                const totalForBrand = totalBrandCounts[key] || 0;
                const statesCount = stat?.states || 0;
                const citiesCount = stat?.cities || 0;
                const barWidth = maxStatCount > 0 ? (count / maxStatCount) * 100 : 0;
                const isContinental = key === "continental";

                return (
                  <button
                    key={key}
                    onClick={() => toggleBrand(key)}
                    className={`
                      brand-card shrink-0 w-[135px] rounded-xl p-2.5 text-left transition-all duration-200 cursor-pointer
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                      ${isSelected
                        ? "shadow-lg scale-[1.02]"
                        : "opacity-60 hover:opacity-80 scale-100"
                      }
                    `}
                    style={{
                      backgroundColor: isSelected
                        ? isContinental
                          ? "rgba(255, 215, 0, 0.08)"
                          : config.color + "12"
                        : "rgba(255,255,255,0.05)",
                      border: isSelected
                        ? isContinental
                          ? "1px solid rgba(255, 215, 0, 0.3)"
                          : `1px solid ${config.color}30`
                        : "1px solid rgba(255,255,255,0.1)",
                      boxShadow: isSelected
                        ? isContinental
                          ? "0 0 20px rgba(255, 215, 0, 0.1)"
                          : `0 0 16px ${config.color}15`
                        : "none",
                    }}
                  >
                    {/* Brand header: dot + name */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: config.color,
                          boxShadow: isSelected
                            ? `0 0 8px ${config.color}60`
                            : "none",
                        }}
                      />
                      <span
                        className={`text-[11px] font-semibold truncate ${
                          isSelected
                            ? isContinental
                              ? "text-yellow-400"
                              : "text-gray-200"
                            : "text-gray-400"
                        }`}
                      >
                        {config.label}
                      </span>
                      {isContinental && isSelected && (
                        <span className="text-[7px] bg-yellow-400 text-gray-900 px-1 py-px rounded font-bold ml-auto shrink-0">
                          TARGET
                        </span>
                      )}
                    </div>

                    {/* Count */}
                    <div
                      className={`text-lg font-bold leading-tight ${
                        isSelected
                          ? isContinental
                            ? "text-yellow-400"
                            : "text-white"
                          : "text-gray-400"
                      }`}
                    >
                      {isSelected ? count.toLocaleString() : totalForBrand.toLocaleString()}
                    </div>

                    {/* Mini progress bar */}
                    {isSelected && (
                      <div className="w-full bg-white/10 rounded-full h-1 mt-1.5 mb-1">
                        <div
                          className="h-1 rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: config.color,
                          }}
                        />
                      </div>
                    )}

                    {/* States / Cities */}
                    {isSelected && (
                      <div className="flex gap-2 text-[9px] text-gray-500">
                        <span>{statesCount} states</span>
                        <span>{citiesCount} cities</span>
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Main Content - Map + Bottom Panel */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Map */}
        <div className={`flex-1 min-h-0 map-wrapper relative ${isFullscreen ? "fixed inset-0 z-50 bg-black" : ""}`}>
          <MapComponent
            dealers={filteredDealers}
            center={mapCenter}
            zoom={mapZoom}
            selectedBrands={selectedBrands}
            mapMode={mapMode}
          />
          {/* Fullscreen Toggle Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="absolute top-3 right-3 z-[1000] bg-black/80 backdrop-blur-md hover:bg-black/90 text-gray-300 hover:text-white rounded-lg p-2 border border-white/10 shadow-lg shadow-black/30 transition-all duration-200"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          {/* Map Legend */}
          <div className={`map-overlay absolute bottom-3 left-3 bg-black/80 backdrop-blur-md rounded-lg shadow-lg shadow-black/30 p-2.5 border border-white/10 ${isFullscreen ? "bottom-6 left-6" : ""}`}>
            <h4 className="text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
              Legend
            </h4>
            {mapMode === "heatmap" ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-24 h-2 rounded-full" style={{ background: "linear-gradient(to right, transparent, #fef9c3, #fde047, #facc15, #f97316, #ea580c, #dc2626, #991b1b, #450a0a)" }} />
                </div>
                <div className="flex justify-between text-[8px] text-gray-500 w-24">
                  <span>Low</span>
                  <span>High</span>
                </div>
                <div className="text-[8px] text-gray-500 mt-1">
                  Continental = higher intensity
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
                {Object.entries(BRAND_CONFIG)
                  .filter(([key]) => selectedBrands.has(key))
                  .sort(([, a], [, b]) => a.priority - b.priority)
                  .map(([key, config]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: config.color,
                          boxShadow:
                            key === "continental"
                              ? `0 0 6px ${config.color}`
                              : "none",
                        }}
                      />
                      <span className="text-[9px] text-gray-400 whitespace-nowrap">
                        {config.label}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Panel - State Analysis */}
        {!isFullscreen && (
        <div className="bottom-panel bg-gray-950 border-t border-white/5 overflow-hidden shrink-0 flex flex-col" style={{ height: showStateTable ? "clamp(140px, 22vh, 220px)" : "40px" }}>
          <button
            onClick={() => setShowStateTable(!showStateTable)}
            className="flex items-center justify-between px-4 py-1.5 hover:bg-white/5 transition-colors shrink-0 border-b border-white/5"
          >
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              State / UT Analysis
            </h3>
            {showStateTable ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
            )}
          </button>
          {showStateTable && (
            <div className="flex-1 min-h-0 overflow-x-auto custom-scrollbar-dark">
              <table className="w-full text-xs">
                <thead className="bg-white/5 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-semibold text-gray-500 min-w-[130px] text-[10px] uppercase tracking-wider">
                      State / UT
                    </th>
                    <th className="text-center px-2 py-1.5 font-semibold text-yellow-500 min-w-[70px] text-[10px] uppercase tracking-wider">
                      Continental
                    </th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-500 min-w-[70px] text-[10px] uppercase tracking-wider">
                      Competitors
                    </th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-500 min-w-[50px] text-[10px] uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-500 min-w-[50px] text-[10px] uppercase tracking-wider">
                      Share
                    </th>
                    <th className="text-left px-3 py-1.5 font-semibold text-gray-500 min-w-[240px] text-[10px] uppercase tracking-wider">
                      Distribution
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stateStats.slice(0, 20).map((ss) => {
                    const share =
                      ss.total > 0
                        ? ((ss.continental / ss.total) * 100).toFixed(1)
                        : "0.0";
                    const maxBrand = Math.max(
                      ...Object.values(ss.brands),
                      1
                    );
                    return (
                      <tr
                        key={ss.state}
                        className="border-b border-white/5 hover:bg-yellow-500/5 cursor-pointer transition-colors"
                        onClick={() => handleStateSelect(ss.state)}
                      >
                        <td className="px-3 py-1 font-medium text-gray-300">
                          <span className="truncate block max-w-[120px]">
                            {ss.state}
                          </span>
                          {ss.continental > 0 && (
                            <span className="ml-1 text-yellow-500 text-[8px]">
                              ●
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-center font-bold text-yellow-400">
                          {ss.continental}
                        </td>
                        <td className="px-2 py-1 text-center text-gray-500">
                          {ss.competitors.toLocaleString()}
                        </td>
                        <td className="px-2 py-1 text-center font-medium text-gray-400">
                          {ss.total.toLocaleString()}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <span
                            className={`font-medium ${
                              parseFloat(share) >= 5
                                ? "text-emerald-400"
                                : parseFloat(share) >= 1
                                ? "text-yellow-400"
                                : "text-gray-500"
                            }`}
                          >
                            {share}%
                          </span>
                        </td>
                        <td className="px-3 py-1">
                          <div className="flex gap-px h-4 items-end">
                            {Object.entries(ss.brands)
                              .sort(([, a], [, b]) => b - a)
                              .map(([brand, count]) => {
                                const config = Object.values(
                                  BRAND_CONFIG
                                ).find((c) => c.label === brand);
                                const height = Math.max(
                                  (count / maxBrand) * 16,
                                  1.5
                                );
                                return (
                                  <div
                                    key={brand}
                                    title={`${brand}: ${count}`}
                                    className="w-1.5 rounded-t-sm transition-all hover:w-2.5"
                                    style={{
                                      height: `${height}px`,
                                      backgroundColor:
                                        config?.color || "#999",
                                      opacity:
                                        brand === "Continental"
                                          ? 1
                                          : 0.4,
                                    }}
                                  />
                                );
                              })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
