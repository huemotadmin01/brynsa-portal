import { useState, useEffect } from 'react';
import {
  X, Linkedin, Mail, Phone, Building2, MapPin, Briefcase,
  Calendar, Globe, StickyNote, Plus, Trash2, ExternalLink,
  User, Clock, Tag, RefreshCw
} from 'lucide-react';
import api from '../utils/api';

function LeadDetailPanel({ lead, onClose, onUpdate }) {
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState(lead?.notes || []);
  const [profileType, setProfileType] = useState(lead?.profileType || '');
  const [savingProfileType, setSavingProfileType] = useState(false);

  // Sync notes when lead changes
  useEffect(() => {
    setNotes(lead?.notes || []);
  }, [lead?._id, lead?.notes]);

  // Sync profileType when lead changes
  useEffect(() => {
    setProfileType(lead?.profileType || '');
  }, [lead?._id, lead?.profileType]);

  if (!lead) return null;

  // Save notes to API
  const saveNotesToApi = async (updatedNotes) => {
    try {
      setSavingNotes(true);
      // Try the dedicated notes endpoint first, fall back to updateLead
      try {
        await api.updateLeadNotes(lead._id, updatedNotes);
      } catch (err) {
        // If notes endpoint doesn't exist, try updating the full lead
        await api.updateLead(lead._id, { notes: updatedNotes });
      }
      console.log('Notes saved to API successfully');
    } catch (err) {
      console.error('Failed to save notes to API:', err);
      // Don't throw - we still want local update to work
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);

    const noteObj = {
      text: newNote.trim(),
      date: new Date().toLocaleDateString()
    };

    try {
      const updatedNotes = [...notes, noteObj];
      setNotes(updatedNotes);
      setNewNote('');

      // Save to API
      await saveNotesToApi(updatedNotes);

      // Notify parent component
      if (onUpdate) {
        onUpdate({ ...lead, notes: updatedNotes });
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (index) => {
    const updatedNotes = notes.filter((_, i) => i !== index);
    setNotes(updatedNotes);

    // Save to API
    await saveNotesToApi(updatedNotes);

    if (onUpdate) {
      onUpdate({ ...lead, notes: updatedNotes });
    }
  };

  const handleProfileTypeChange = async (newType) => {
    setProfileType(newType);
    try {
      setSavingProfileType(true);
      await api.updateLead(lead._id, { profileType: newType });
      console.log('Profile type saved to API successfully');
      if (onUpdate) {
        onUpdate({ ...lead, profileType: newType });
      }
    } catch (err) {
      console.error('Failed to save profile type:', err);
      // Revert on failure
      setProfileType(lead?.profileType || '');
    } finally {
      setSavingProfileType(false);
    }
  };

  const InfoRow = ({ icon: Icon, label, value, isLink = false, href = '' }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-dark-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-dark-500 mb-0.5">{label}</p>
          {isLink ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-rivvra-400 hover:underline flex items-center gap-1"
            >
              {value}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-sm text-white break-words">{value}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-dark-900 border-l border-dark-700 shadow-2xl z-50 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <div className="flex items-center gap-3">
          {lead.profilePicture ? (
            <img
              src={lead.profilePicture}
              alt={lead.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center">
              <User className="w-6 h-6 text-dark-400" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-white">{lead.name || 'Unknown'}</h2>
            <p className="text-sm text-dark-400">{lead.title || lead.headline || '-'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-dark-400" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 p-4 border-b border-dark-700">
        {lead.linkedinUrl && (
          <a
            href={lead.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn Profile
          </a>
        )}
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center gap-2 px-3 py-2 bg-dark-800 hover:bg-dark-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Mail className="w-4 h-4" />
            Send Email
          </a>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact Information */}
        <div className="p-4 border-b border-dark-700">
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
            Contact Information
          </h3>
          <div className="space-y-1">
            <InfoRow
              icon={Mail}
              label="Email"
              value={lead.email}
              isLink={!!lead.email}
              href={`mailto:${lead.email}`}
            />
            <InfoRow icon={Phone} label="Phone" value={lead.phone} />
            <InfoRow
              icon={Linkedin}
              label="LinkedIn"
              value={lead.linkedinUrl ? 'View Profile' : null}
              isLink={!!lead.linkedinUrl}
              href={lead.linkedinUrl}
            />
          </div>
        </div>

        {/* Professional Information */}
        <div className="p-4 border-b border-dark-700">
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
            Professional Details
          </h3>
          <div className="space-y-1">
            <InfoRow icon={Briefcase} label="Job Title" value={lead.title || lead.headline} />
            <InfoRow icon={Building2} label="Company" value={lead.company} />
            <InfoRow icon={MapPin} label="Location" value={lead.location} />
            {lead.industry && <InfoRow icon={Tag} label="Industry" value={lead.industry} />}
          </div>
        </div>

        {/* Profile Type */}
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider">
              Profile Type
            </h3>
            {savingProfileType && (
              <div className="flex items-center gap-1 text-xs text-dark-500">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Saving...
              </div>
            )}
          </div>
          <select
            value={profileType}
            onChange={(e) => handleProfileTypeChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-xl text-white focus:outline-none focus:border-rivvra-500 appearance-none cursor-pointer"
          >
            <option value="">Select type...</option>
            <option value="candidate">Candidate</option>
            <option value="client">Client</option>
          </select>
        </div>

        {/* Contact Metadata */}
        <div className="p-4 border-b border-dark-700">
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
            Contact Details
          </h3>
          <div className="space-y-1">
            <InfoRow icon={Globe} label="Source" value={lead.leadSource || 'Extension'} />
            <InfoRow
              icon={Calendar}
              label="Added On"
              value={lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}
            />
            {lead.lists && lead.lists.length > 0 && (
              <div className="flex items-start gap-3 py-2">
                <Tag className="w-4 h-4 text-dark-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-dark-500 mb-1">Lists</p>
                  <div className="flex flex-wrap gap-1">
                    {lead.lists.map((list, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-dark-800 text-dark-300 rounded-full"
                      >
                        {list}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider">
              Notes ({notes.length})
            </h3>
            {savingNotes && (
              <div className="flex items-center gap-1 text-xs text-dark-500">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Saving...
              </div>
            )}
          </div>

          {/* Add Note Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-500 focus:outline-none focus:border-rivvra-500"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || addingNote}
              className="px-3 py-2 bg-rivvra-500 hover:bg-rivvra-400 disabled:opacity-50 disabled:cursor-not-allowed text-dark-950 font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Notes List */}
          {notes.length === 0 ? (
            <div className="text-center py-6">
              <StickyNote className="w-8 h-8 text-dark-600 mx-auto mb-2" />
              <p className="text-sm text-dark-500">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note, index) => (
                <div
                  key={index}
                  className="group p-3 bg-dark-800 rounded-lg border border-dark-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white flex-1">{note.text}</p>
                    <button
                      onClick={() => handleDeleteNote(index)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-dark-700 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-dark-500 hover:text-red-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Clock className="w-3 h-3 text-dark-600" />
                    <span className="text-xs text-dark-500">{note.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeadDetailPanel;
