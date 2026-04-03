import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRegions, updateRegion, getRegionUtilities, updateRegionUtilityAvailability } from '../../services/api';
import './Regions.css';

const RegionEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    region_name: '',
    postal_code: '',
  });
  const [utilities, setUtilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [utilityError, setUtilityError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [regionsRes, utilitiesRes] = await Promise.all([
          getRegions(),
          getRegionUtilities(id),
        ]);
        const regions = regionsRes.data.data || [];
        const region = regions.find(r => r.region_id === parseInt(id));
        if (!region) {
          setError('Region not found');
        } else {
          setFormData({
            region_name: region.region_name,
            postal_code: region.postal_code,
          });
        }
        setUtilities(utilitiesRes.data);
      } catch (err) {
        setError('Failed to load region');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateRegion(id, formData);
      navigate('/employee/regions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update region');
    }
  };

  const handleUtilityToggle = async (utilityId, currentValue) => {
    setUtilityError('');
    const newValue = !currentValue;
    setUtilities(prev =>
      prev.map(u => u.utility_id === utilityId ? { ...u, is_available: newValue } : u)
    );
    try {
      await updateRegionUtilityAvailability(id, utilityId, { is_available: newValue });
    } catch (err) {
      setUtilityError('Failed to update utility availability');
      setUtilities(prev =>
        prev.map(u => u.utility_id === utilityId ? { ...u, is_available: currentValue } : u)
      );
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="form-container">
      <h2>Edit Region</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Region Name:</label>
          <input
            type="text"
            name="region_name"
            value={formData.region_name}
            onChange={handleChange}
            placeholder="e.g., Mirpur, Dhanmondi, Gulshan"
            required
          />
        </div>
        <div className="form-group">
          <label>Postal Code:</label>
          <input
            type="text"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            placeholder="e.g., 1216"
            required
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">Save Changes</button>
          <button
            type="button"
            onClick={() => navigate('/employee/regions')}
            className="btn-cancel"
          >
            Cancel
          </button>
        </div>
      </form>

      {utilities.length > 0 && (
        <div className="utility-availability-section">
          <h3>Utility Availability</h3>
          <p className="utility-availability-hint">
            Disable a utility to stop accepting new connections for it in this region (e.g. overloaded / limited capacity).
          </p>
          {utilityError && <div className="error-message">{utilityError}</div>}
          <div className="utility-availability-list">
            {utilities.map(u => (
              <div key={u.utility_id} className="utility-availability-row">
                <div className="utility-info">
                  <span className="utility-name">{u.utility_name}</span>
                  <span className="utility-type">{u.utility_type}</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={u.is_available}
                    onChange={() => handleUtilityToggle(u.utility_id, u.is_available)}
                  />
                  <span className="toggle-slider" />
                </label>
                <span className={`availability-label ${u.is_available ? 'available' : 'unavailable'}`}>
                  {u.is_available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionEdit;
