"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Bot,
  MapPin,
  Heart,
  Clock,
  X,
  ImageIcon,
  ThumbsUp,
  Flame,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { api, SocialPost, User as UserType, DonorResponse } from "@/services/api";
import { LocationSelector } from "@/components/LocationSelector";

interface SocialFeedProps {
  currentUser: UserType | null;
  onOpenAuth: () => void;
  onSelectUserToChat: (userId: number, userName: string) => void;
}

const BLOOD_GROUPS = ["ALL", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const SocialFeed: React.FC<SocialFeedProps> = ({
  currentUser,
  onOpenAuth,
  onSelectUserToChat,
}) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [recentDonors, setRecentDonors] = useState<DonorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [locationSearch, setLocationSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // New Post Modal
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postBloodGroup, setPostBloodGroup] = useState("O+");
  const [postLocation, setPostLocation] = useState("Sylhet");
  const [postUrgency, setPostUrgency] = useState("CRITICAL");
  const [posting, setPosting] = useState(false);

  // Interaction stats state
  const [likesMap, setLikesMap] = useState<Record<number, number>>({});
  const [hasLikedMap, setHasLikedMap] = useState<Record<number, boolean>>({});

  const fetchPosts = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.getPosts(selectedGroup, locationSearch);
      const fetchedPosts = res.posts || [];
      setPosts(fetchedPosts);

      const initialLikes: Record<number, number> = {};
      const initialHasLiked: Record<number, boolean> = {};

      fetchedPosts.forEach((p) => {
        initialLikes[p.id] = p.likes_count ?? 0;
        if (currentUser && p.liked_by) {
          initialHasLiked[p.id] = p.liked_by.includes(currentUser.id);
        }
      });

      setLikesMap(initialLikes);
      // Preserve previously known liked state for posts whose liked_by was omitted this poll
      setHasLikedMap((prev) => ({ ...prev, ...initialHasLiked }));
    } catch {
      // ignore
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedGroup, locationSearch, currentUser]);



  const fetchDonors = useCallback(async () => {
    try {
      const res = await api.listDonors();
      setRecentDonors(res.donors?.slice(0, 5) || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    api.getPosts(selectedGroup, locationSearch).then((res) => {
      if (isCancelled) return;
      const fetchedPosts = res.posts || [];
      setPosts(fetchedPosts);

      const initialLikes: Record<number, number> = {};
      const initialHasLiked: Record<number, boolean> = {};

      fetchedPosts.forEach((p) => {
        initialLikes[p.id] = p.likes_count ?? 0;
        if (currentUser && p.liked_by) {
          initialHasLiked[p.id] = p.liked_by.includes(currentUser.id);
        }
      });

      setLikesMap(initialLikes);
      setHasLikedMap((prev) => ({ ...prev, ...initialHasLiked }));
      setLoading(false);
    }).catch(() => {
      if (!isCancelled) setLoading(false);
    });

    api.listDonors().then((res) => {
      if (!isCancelled) {
        setRecentDonors(res.donors?.slice(0, 5) || []);
      }
    }).catch(() => {});

    const timer = setInterval(() => {
      fetchPosts(false);
      fetchDonors();
    }, 6000);
    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, [selectedGroup, locationSearch, currentUser, fetchPosts, fetchDonors]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!postContent.trim() || posting) return;

    setPosting(true);
    try {
      const res = await api.createPost({
        user_id: currentUser.id,
        author_name: currentUser.name,
        blood_group: postBloodGroup,
        location: postLocation,
        urgency: postUrgency,
        content: postContent,
      });

      setNotice(
        `🚨 Emergency Request Published! AI engine matched and dispatched alerts to ${res.matched_donors} donor(s) via Gmail SMTP.`
      );
      setIsPostOpen(false);
      setPostContent("");
      await fetchPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post emergency request.";
      setNotice(`⚠️ ${msg}`);
    } finally {
      setPosting(false);
      setTimeout(() => setNotice(null), 6000);
    }
  };

  const handlePledge = async (postId: number) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    try {
      const res = await api.pledgePost(postId, {
        donor_id: currentUser.id,
        donor_name: currentUser.name,
        donor_email: currentUser.email,
      });
      setNotice(`❤️ ${res.message}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thank you for pledging to donate!";
      setNotice(`⚠️ ${msg}`);
    } finally {
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const toggleLike = async (postId: number) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const currentlyLiked = hasLikedMap[postId] || false;
    const currentCount = likesMap[postId] ?? 0;
    const newLiked = !currentlyLiked;
    const newCount = Math.max(0, currentCount + (newLiked ? 1 : -1));

    setHasLikedMap((prev) => ({ ...prev, [postId]: newLiked }));
    setLikesMap((prev) => ({ ...prev, [postId]: newCount }));

    try {
      const res = await api.likePost(postId, currentUser.id);
      setLikesMap((prev) => ({ ...prev, [postId]: res.likes_count }));
      setHasLikedMap((prev) => ({ ...prev, [postId]: res.has_liked }));
    } catch {
      setHasLikedMap((prev) => ({ ...prev, [postId]: currentlyLiked }));
      setLikesMap((prev) => ({ ...prev, [postId]: currentCount }));
    }
  };

  // Critical Posts for Emergency Alerts sidebar
  const criticalPosts = posts.filter((p) => p.urgency === "CRITICAL" || p.urgency === "HIGH");

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {notice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="hover:text-emerald-900 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}



      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed Column (Left & Center) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Composer Quick Input */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center font-bold text-rose-800 shrink-0 shadow-xs">
                {currentUser ? currentUser.name.charAt(0) : "U"}
              </div>
              <input
                type="text"
                readOnly
                onClick={() => {
                  if (!currentUser) onOpenAuth();
                  else setIsPostOpen(true);
                }}
                placeholder="Post an urgent blood request to dispatch AI email alerts..."
                className="flex-1 bg-slate-50 border border-slate-200 hover:border-rose-300 rounded-2xl px-4 py-3 text-xs text-slate-700 placeholder-slate-400 cursor-pointer focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-3 text-slate-400">
                <button
                  onClick={() => (currentUser ? setIsPostOpen(true) : onOpenAuth())}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                  title="Attach Details"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                </button>
                <button
                  onClick={() => (currentUser ? setIsPostOpen(true) : onOpenAuth())}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                  title="Select Location"
                >
                  <MapPin className="w-4 h-4 text-rose-600" />
                </button>
                <button
                  onClick={() => (currentUser ? setIsPostOpen(true) : onOpenAuth())}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                  title="Blood Type"
                >
                  <Heart className="w-4 h-4 text-rose-700" />
                </button>
              </div>

              <button
                onClick={() => {
                  if (!currentUser) onOpenAuth();
                  else setIsPostOpen(true);
                }}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm shadow-rose-700/20"
              >
                Create Request
              </button>
            </div>
          </div>

          {/* Blood Group Filter Pills & Search */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  onClick={() => setSelectedGroup(bg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    selectedGroup === bg
                      ? "bg-rose-700 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search location..."
              className="bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none w-full sm:w-44 shrink-0"
            />
          </div>

          {/* Live Backend Posts Feed */}
          {loading && posts.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 rounded-full border-2 border-rose-700 border-t-transparent animate-spin mx-auto mb-3" />
              <span>Fetching live emergency posts from backend...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="font-bold text-slate-800">No emergency posts found for &quot;{selectedGroup}&quot;</p>
              <p className="text-slate-400 text-[11px]">Click &quot;Create Request&quot; above to publish an emergency request!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm hover:border-rose-300 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 font-bold text-sm">
                        {post.author_name ? post.author_name.charAt(0) : "U"}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{post.author_name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-600" />
                            {post.location}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {post.created_at
                              ? new Date(post.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Just now"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-rose-700 text-white font-extrabold text-xs shadow-xs">
                        {post.blood_group} Needed
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          post.urgency === "CRITICAL"
                            ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {post.urgency}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <p className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* AI Analysis Box */}
                  {post.ai_analysis && (
                    <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-purple-800">
                        <Bot className="w-4 h-4 text-purple-700" />
                        <span>AI Engine Matching Analysis:</span>
                      </div>
                      <p className="text-slate-700 text-[11px] leading-relaxed">{post.ai_analysis}</p>
                    </div>
                  )}

                  {/* Card Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
                          hasLikedMap[post.id] ? "text-rose-700 font-bold" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <ThumbsUp className={`w-4 h-4 ${hasLikedMap[post.id] ? "fill-rose-700" : ""}`} />
                        <span>{likesMap[post.id] || 0}</span>
                      </button>

                      {currentUser && post.user_id !== currentUser.id && (
                        <button
                          onClick={() => onSelectUserToChat(post.user_id, post.author_name)}
                          className="flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Direct Chat</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {currentUser && post.user_id === currentUser.id ? (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200">
                          Your Request
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePledge(post.id)}
                          className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <Heart className="w-3.5 h-3.5 fill-white" />
                          <span>I Can Help</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Sidebar (Right) */}
        <div className="space-y-6">
          {/* Live Critical Alerts */}
          <div className="bg-rose-50/70 p-5 rounded-3xl border border-rose-100 space-y-4 shadow-xs">
            <div className="flex items-center justify-between text-rose-800 font-bold text-sm">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-700" />
                <span>Live Critical Alerts</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-extrabold">
                {criticalPosts.length} Active
              </span>
            </div>

            {criticalPosts.length === 0 ? (
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 text-center">
                No critical alerts currently reported.
              </div>
            ) : (
              <div className="space-y-2.5">
                {criticalPosts.slice(0, 3).map((cp) => (
                  <div
                    key={cp.id}
                    onClick={() => {
                      setSelectedGroup(cp.blood_group);
                    }}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-rose-400 flex items-center gap-3 transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Flame className="w-4 h-4 text-rose-700 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-slate-900 text-xs truncate">
                        {cp.blood_group} Needed Urgent
                      </h5>
                      <p className="text-[11px] text-slate-500 truncate">{cp.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Verified Donors in System */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Active Network Donors</span>
              </h4>
            </div>

            {recentDonors.length === 0 ? (
              <p className="text-xs text-slate-500">Loading active donors...</p>
            ) : (
              <div className="space-y-2.5">
                {recentDonors.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-xs shrink-0">
                        {d.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{d.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{d.location}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] shrink-0">
                      {d.blood_group}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Composer Modal */}
      {isPostOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl border border-slate-200 overflow-hidden shadow-2xl space-y-4 p-6 relative">
            <button
              onClick={() => setIsPostOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Post Emergency Blood Need</h3>
                <p className="text-xs text-slate-500">
                  AI will automatically analyze and dispatch alerts to local donors
                </p>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Blood Group</label>
                  <select
                    value={postBloodGroup}
                    onChange={(e) => setPostBloodGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none font-bold"
                  >
                    {BLOOD_GROUPS.filter((b) => b !== "ALL").map((bg) => (
                      <option key={bg} value={bg}>
                        {bg} Blood
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Urgency Level</label>
                  <select
                    value={postUrgency}
                    onChange={(e) => setPostUrgency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none font-bold"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="NORMAL">NORMAL</option>
                  </select>
                </div>
              </div>

              {/* Cascading Location Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Select Location</label>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <LocationSelector onLocationChange={(formatted) => setPostLocation(formatted)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Patient Details & Hospital Instructions
                </label>
                <textarea
                  required
                  rows={4}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Describe hospital details, patient condition, units required, and contact number..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-2xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-rose-700/20"
                >
                  {posting ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    "Publish & Dispatch AI Alert"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
