import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/auth/preferences/');
      setPreferences(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setError(err.response?.data?.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (updates) => {
    try {
      setSaving(true);
      setError(null);

      // Optimistic update
      setPreferences((prev) => ({ ...prev, ...updates }));

      const res = await api.patch('/auth/preferences/', updates);
      setPreferences(res.data.data || res.data);

      return { success: true };
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError(err.response?.data?.message || 'Failed to save');
      // Re-fetch to roll back
      fetchPreferences();
      return { success: false, error: err };
    } finally {
      setSaving(false);
    }
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    saving,
    error,
    updatePreferences,
    refetch: fetchPreferences,
  };
};