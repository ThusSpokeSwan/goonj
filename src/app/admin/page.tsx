'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Link, Calendar, Check, Trash2, ShieldAlert, RefreshCw, FileText, ArrowLeft, Loader2 } from 'lucide-react';

interface Scheme {
  id: string;
  title: string;
  ministry: string | null;
  state: string;
  minAge: number | null;
  maxAge: number | null;
  genderRestriction: string;
  incomeCeiling: number | null;
  occupations: string;
  casteCategories: string;
  expiryDate: string | null;
  documentUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [purging, setPurging] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [ministry, setMinistry] = useState('');
  const [state, setState] = useState('Central');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [genderRestriction, setGenderRestriction] = useState('All');
  const [incomeCeiling, setIncomeCeiling] = useState('');
  const [occupations, setOccupations] = useState('');
  const [casteCategories, setCasteCategories] = useState('General, OBC, SC, ST');
  const [expiryDate, setExpiryDate] = useState('');
  const [ingestionType, setIngestionType] = useState<'pdf' | 'url'>('pdf');
  const [linkUrl, setLinkUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/schemes');
      const data = await res.json();
      if (data.success) {
        setSchemes(data.schemes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const showNotification = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 6000);
  };

  const handleAddScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !state.trim()) {
      showNotification('Scheme Title and State are required.', true);
      return;
    }
    if (ingestionType === 'pdf' && !file) {
      showNotification('Please upload a guideline PDF file.', true);
      return;
    }
    if (ingestionType === 'url' && !linkUrl.trim()) {
      showNotification('Please enter a guideline website link.', true);
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('ministry', ministry);
    formData.append('state', state);
    if (minAge) formData.append('minAge', minAge);
    if (maxAge) formData.append('maxAge', maxAge);
    formData.append('genderRestriction', genderRestriction);
    if (incomeCeiling) formData.append('incomeCeiling', incomeCeiling);
    formData.append('occupations', occupations);
    formData.append('casteCategories', casteCategories);
    if (expiryDate) formData.append('expiryDate', expiryDate);

    if (ingestionType === 'pdf' && file) {
      formData.append('file', file);
    } else {
      formData.append('linkUrl', linkUrl);
    }

    try {
      const res = await fetch('/api/admin/schemes', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Scheme successfully ingested! Processed ${data.chunksProcessed} vector chunks.`);
        // Reset form
        setTitle('');
        setMinistry('');
        setMinAge('');
        setMaxAge('');
        setIncomeCeiling('');
        setOccupations('');
        setExpiryDate('');
        setFile(null);
        setLinkUrl('');
        // Re-fetch
        fetchSchemes();
      } else {
        showNotification(data.error || 'Failed to ingest scheme.', true);
      }
    } catch (err: any) {
      showNotification(err.message || 'An error occurred during upload.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteScheme = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheme? All metadata and search embeddings will be lost.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/schemes?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Scheme deleted successfully.');
        fetchSchemes();
      } else {
        showNotification(data.error || 'Failed to delete scheme.', true);
      }
    } catch (err: any) {
      showNotification(err.message || 'An error occurred.', true);
    }
  };

  const handlePurgeExpired = async () => {
    setPurging(true);
    try {
      const res = await fetch('/api/admin/purge', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchSchemes();
      } else {
        showNotification(data.error || 'Failed to run database clean-up.', true);
      }
    } catch (err: any) {
      showNotification(err.message || 'An error occurred.', true);
    } finally {
      setPurging(false);
    }
  };

  const indianStates = [
    'Central', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 
    'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 pb-6 border-b border-zinc-800">
        <div>
          <a href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-2 text-sm">
            <ArrowLeft size={16} /> Back to Checker
          </a>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Scheme Admin Portal
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Feed, update, or clear state and central entitlement criteria databases.
          </p>
        </div>

        <button
          onClick={handlePurgeExpired}
          disabled={purging}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 transition-all text-sm font-medium disabled:opacity-50"
        >
          {purging ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Sync & Purge Expired Schemes
        </button>
      </div>

      {/* Notifications */}
      {message && (
        <div className={`p-4 rounded-xl mb-8 flex items-start gap-3 border ${
          message.isError 
            ? 'bg-red-950/40 border-red-800/60 text-red-200' 
            : 'bg-teal-950/40 border-teal-800/60 text-teal-200'
        }`}>
          <ShieldAlert size={20} className="shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form panel */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 h-fit border border-zinc-800">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Upload size={18} className="text-purple-400" />
            Add New Scheme
          </h2>
          
          <form onSubmit={handleAddScheme} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Scheme Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. PM Kisan Samman Nidhi"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Ministry / Department
              </label>
              <input
                type="text"
                value={ministry}
                onChange={e => setMinistry(e.target.value)}
                placeholder="e.g. Ministry of Agriculture"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  State Scope
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  {indianStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Gender Eligibility
                </label>
                <select
                  value={genderRestriction}
                  onChange={e => setGenderRestriction(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="All">All Genders</option>
                  <option value="Female">Female Only</option>
                  <option value="Male">Male Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Min Age Limit
                </label>
                <input
                  type="number"
                  value={minAge}
                  onChange={e => setMinAge(e.target.value)}
                  placeholder="e.g. 18"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Max Age Limit
                </label>
                <input
                  type="number"
                  value={maxAge}
                  onChange={e => setMaxAge(e.target.value)}
                  placeholder="e.g. 60"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Max Income Ceiling (Annual INR)
              </label>
              <input
                type="number"
                value={incomeCeiling}
                onChange={e => setIncomeCeiling(e.target.value)}
                placeholder="e.g. 200000"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Eligible Occupations (Comma-separated)
              </label>
              <input
                type="text"
                value={occupations}
                onChange={e => setOccupations(e.target.value)}
                placeholder="e.g. farmer, student, unemployed"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">Leave empty or type &apos;all&apos; for all jobs.</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Caste Categories
                </label>
                <input
                  type="text"
                  value={casteCategories}
                  onChange={e => setCasteCategories(e.target.value)}
                  placeholder="SC, ST, OBC, General"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar size={12} /> Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Ingestion Source Tabs */}
            <div className="pt-2 border-t border-zinc-800">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Guideline Source Format
              </label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-lg mb-3">
                <button
                  type="button"
                  onClick={() => setIngestionType('pdf')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    ingestionType === 'pdf' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  PDF Document
                </button>
                <button
                  type="button"
                  onClick={() => setIngestionType('url')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    ingestionType === 'url' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Web Link (URL)
                </button>
              </div>

              {ingestionType === 'pdf' ? (
                <div className="border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 p-4 rounded-lg text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    id="pdf-upload"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer block">
                    <FileText className="mx-auto text-zinc-500 mb-2" size={30} />
                    <span className="text-xs font-medium text-zinc-300 block">
                      {file ? file.name : 'Select guidelines PDF file'}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1 block">Max size 15MB</span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 shrink-0 text-zinc-400">
                    <Link size={16} />
                  </div>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://scheme-guideline-portal.gov.in"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/20"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Ingesting & Embedding...
                </>
              ) : (
                <>
                  <Check size={16} /> Save & Vectorize Scheme
                </>
              )}
            </button>
          </form>
        </div>

        {/* Database catalog list */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-zinc-800">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FileText size={18} className="text-teal-400" />
            Active Scheme Catalog ({schemes.length})
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <Loader2 size={36} className="animate-spin text-purple-400 mb-4" />
              <p className="text-sm font-medium">Fetching scheme databases...</p>
            </div>
          ) : schemes.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
              <FileText className="mx-auto text-zinc-700 mb-4" size={40} />
              <h3 className="text-md font-semibold text-zinc-400 mb-1">Catalog Empty</h3>
              <p className="text-xs max-w-xs mx-auto">There are no schemes registered. Fill out the form to parse and add your first scheme guidelines.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 pr-2">Scheme Name</th>
                    <th className="pb-3 px-2">Scope / Dept</th>
                    <th className="pb-3 px-2">Criteria (Age/Income)</th>
                    <th className="pb-3 px-2">Expiration</th>
                    <th className="pb-3 pl-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {schemes.map(sch => (
                    <tr key={sch.id} className="text-zinc-300 hover:bg-zinc-900/30 transition-colors">
                      <td className="py-4 pr-2 font-medium text-white max-w-[200px] truncate">
                        <div className="font-semibold text-sm">{sch.title}</div>
                        <div className="text-[10px] text-zinc-500 max-w-[190px] truncate mt-0.5">{sch.documentUrl}</div>
                      </td>
                      <td className="py-4 px-2">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 mr-1.5">
                          {sch.state}
                        </span>
                        <span className="text-xs text-zinc-400 truncate max-w-[100px] inline-block align-middle">
                          {sch.ministry || 'State Scheme'}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-xs">
                        <div>
                          Age:{' '}
                          {sch.minAge !== null || sch.maxAge !== null
                            ? `${sch.minAge || '0'}-${sch.maxAge || '∞'}`
                            : 'All ages'}
                        </div>
                        <div className="text-zinc-400 text-[10px] mt-0.5">
                          Income cap:{' '}
                          {sch.incomeCeiling !== null
                            ? `₹${sch.incomeCeiling.toLocaleString()}`
                            : 'No ceiling'}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-xs">
                        {sch.expiryDate ? (
                          <span className={`inline-flex items-center gap-1 ${
                            new Date(sch.expiryDate) < new Date() ? 'text-red-400 font-semibold' : 'text-zinc-400'
                          }`}>
                            {new Date(sch.expiryDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-zinc-500">Never</span>
                        )}
                      </td>
                      <td className="py-4 pl-2 text-right">
                        <button
                          onClick={() => handleDeleteScheme(sch.id)}
                          className="p-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-950 transition-all"
                          title="Delete Scheme"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
