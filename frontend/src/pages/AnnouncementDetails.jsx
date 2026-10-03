import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Megaphone, ArrowLeft, Calendar, User } from 'lucide-react';
import { memberService } from '../services/api';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function AnnouncementDetails() {
  const { announcementId } = useParams();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnnouncement() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getAnnouncementDetails(announcementId);
        if (response.data?.success) {
          setAnnouncement(response.data.data?.announcement || response.data.data);
        } else {
          setError('Announcement not found.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server.');
        } else if (err.response.status === 404) {
          setError('The requested announcement notice was not found.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to fetch announcement details.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchAnnouncement();
  }, [announcementId]);

  if (loading) {
    return <LoadingSpinner message="Opening announcement notice..." />;
  }

  if (error || !announcement) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert variant="error">{error || 'Announcement not found.'}</Alert>
        <Link
          to="/announcements"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#714B67] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to announcements
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/announcements"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#714B67] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to announcements
      </Link>

      <article className="bg-white border border-[#e2e5e9] rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="pb-4 border-b border-[#e2e5e9] mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#714B67]/10 text-[#714B67] text-xs font-semibold uppercase mb-3">
            <Megaphone className="w-3.5 h-3.5" /> Official Notice
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#000000]">{announcement.title}</h1>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 mt-3 pt-3 border-t border-dashed border-[#e2e5e9]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#714B67]" />
              Published on {announcement.publishedDate || 'N/A'}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#714B67]" />
              Posted by {announcement.author?.name || 'Association Administrator'}
            </span>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
          {announcement.content}
        </div>
      </article>
    </div>
  );
}
