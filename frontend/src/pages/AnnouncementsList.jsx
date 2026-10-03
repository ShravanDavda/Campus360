import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Calendar, User, ArrowRight } from 'lucide-react';
import { memberService } from '../services/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export default function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnnouncements() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getAnnouncements();
        if (response.data?.success) {
          const items = response.data.data?.announcements || response.data.data || [];
          setAnnouncements(Array.isArray(items) ? items : []);
        } else {
          setError('Unable to load announcements.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to fetch announcements.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchAnnouncements();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading organization bulletins..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000000]">Announcements</h1>
        <p className="text-sm text-[#555555] mt-1">
          Official news, updates, and notices from LDCE Student Association leadership.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="There are currently no active announcements published for members."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.announcementId}
              className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm hover:border-[#714B67]/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-[#000000]">{ann.title}</h3>
                <span className="text-xs text-gray-400 font-medium shrink-0 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#714B67]" />
                  {ann.publishedDate || 'Recent'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed whitespace-pre-line">
                {ann.content}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-[#e2e5e9]">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <User className="w-3.5 h-3.5 text-[#714B67]" />
                  <span>Posted by {ann.author?.name || 'Association Leadership'}</span>
                </div>

                <Link
                  to={`/announcements/${ann.announcementId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] hover:underline"
                >
                  Read full notice <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
