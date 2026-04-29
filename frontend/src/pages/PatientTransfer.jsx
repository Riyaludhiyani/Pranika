import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  searchHospitalsBySpecialty,
  getHospitalPatients,
  initiatePatientTransfer,
  getPendingPatientTransfers,
  getUserTransferRequests,
  approveUserTransfer,
  rejectUserTransfer,
  getMyPatientTransfers,
  approvePatientTransfer,
  rejectPatientTransfer,
  markPatientInTransit,
  completePatientTransfer,
} from '../services/api';
import { useHospitalAuth } from '../context/HospitalAuthContext';

export default function PatientTransfer() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { hospital: currentHospital } = useHospitalAuth();

  // Search state
  const [specialty, setSpecialty] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);

  // Patient selection state
  const [patients, setPatients] = useState([]);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [transferNotes, setTransferNotes] = useState('');

  // Pending requests state
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [userTransferRequests, setUserTransferRequests] = useState([]);
  const [reasonForReject, setReasonForReject] = useState('');
  const [selectedTransferToReject, setSelectedTransferToReject] = useState(null);
  const [selectedUserTransfer, setSelectedUserTransfer] = useState(null);
  const [userTransferRejectReason, setUserTransferRejectReason] = useState('');

  // My transfers state
  const [myTransfers, setMyTransfers] = useState([]);
  const [ambulanceDetails, setAmbulanceDetails] = useState('');
  const [selectedTransferInTransit, setSelectedTransferInTransit] = useState(null);

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingTransfers();
    } else if (activeTab === 'my-transfers') {
      loadMyTransfers();
    }
  }, [activeTab]);

  // Search for hospitals by specialty
  const handleSearchHospitals = async (e) => {
    e.preventDefault();
    if (!specialty.trim()) {
      setError('Please enter a specialty');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await searchHospitalsBySpecialty({
        specialty: specialty.trim(),
      });
      // Filter out the initiating hospital from results (check possible id fields)
      const results = response.data.data || [];
      const myHospitalId = currentHospital?.hospitalId || currentHospital?._id || currentHospital?.id || null;
      const filtered = results.filter((h) => {
        if (!myHospitalId) return true;
        return String(h._id) !== String(myHospitalId);
      });
      setSearchResults(filtered);
      if (filtered.length === 0) {
        setError('No hospitals found with this specialty');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search hospitals');
    } finally {
      setLoading(false);
    }
  };

  // Load patients when hospital is selected
  const handleSelectHospital = async (hospital) => {
    setSelectedHospital(hospital);
    try {
      setLoading(true);
      setError('');
      const response = await getHospitalPatients({
        status: 'ready-for-transfer',
      });
      setPatients(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  // Initiate transfer
  const handleInitiateTransfer = async () => {
    if (!selectedHospital || selectedPatients.length === 0) {
      setError('Please select a hospital and at least one patient');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create one transfer request per selected patient
      const promises = selectedPatients.map((patientId) =>
        initiatePatientTransfer({
          patientId,
          toHospitalId: selectedHospital._id,
          requiredSpecialty: specialty,
          transferReason: transferNotes,
        })
      );

      await Promise.all(promises);

      setSuccess('Transfer request(s) created successfully!');
      setTimeout(() => {
        setSuccess('');
        setSelectedHospital(null);
        setSelectedPatients([]);
        setTransferNotes('');
        setSpecialty('');
        setSearchResults([]);
        setPatients([]);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate transfer');
    } finally {
      setLoading(false);
    }
  };

  // Load pending transfers
  const loadPendingTransfers = async () => {
    try {
      setLoading(true);
      setError('');
      const [response1, response2] = await Promise.all([
        getPendingPatientTransfers(),
        getUserTransferRequests()
      ]);
      setPendingTransfers(response1.data.data || []);
      setUserTransferRequests(response2.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending transfers');
    } finally {
      setLoading(false);
    }
  };

  // Approve transfer
  const handleApproveTransfer = async (transferId) => {
    try {
      setLoading(true);
      setError('');

      const eta = prompt('Enter ETA (estimated time of arrival) in hours:');
      if (!eta || isNaN(eta)) {
        setError('Invalid ETA');
        return;
      }

      await approvePatientTransfer(transferId, {
        estimatedArrivalTime: parseInt(eta),
      });

      setSuccess('Transfer approved!');
      setTimeout(() => {
        setSuccess('');
        loadPendingTransfers();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve transfer');
    } finally {
      setLoading(false);
    }
  };

  // Reject transfer
  const handleRejectTransfer = async (transferId) => {
    if (!reasonForReject.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await rejectPatientTransfer(transferId, {
        rejectionReason: reasonForReject,
      });

      setSuccess('Transfer rejected!');
      setTimeout(() => {
        setSuccess('');
        setReasonForReject('');
        setSelectedTransferToReject(null);
        loadPendingTransfers();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject transfer');
    } finally {
      setLoading(false);
    }
  };

  // Approve user transfer request
  const handleApproveUserTransfer = async (transferId) => {
    try {
      setLoading(true);
      setError('');

      await approveUserTransfer(transferId, {
        notes: 'Transfer request approved'
      });

      setSuccess('User transfer approved!');
      setTimeout(() => {
        setSuccess('');
        setSelectedUserTransfer(null);
        loadPendingTransfers();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve user transfer');
    } finally {
      setLoading(false);
    }
  };

  // Reject user transfer request
  const handleRejectUserTransfer = async (transferId) => {
    if (!userTransferRejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await rejectUserTransfer(transferId, {
        reason: userTransferRejectReason
      });

      setSuccess('User transfer rejected!');
      setTimeout(() => {
        setSuccess('');
        setUserTransferRejectReason('');
        setSelectedUserTransfer(null);
        loadPendingTransfers();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject user transfer');
    } finally {
      setLoading(false);
    }
  };

  // Load my transfers
  const loadMyTransfers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getMyPatientTransfers();
      setMyTransfers(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load my transfers');
    } finally {
      setLoading(false);
    }
  };

  // Mark in transit
  const handleMarkInTransit = async (transferId) => {
    if (!ambulanceDetails.trim()) {
      setError('Please enter ambulance details');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await markPatientInTransit(transferId, {
        ambulanceDetails: ambulanceDetails,
      });

      setSuccess('Patient marked as in transit!');
      setTimeout(() => {
        setSuccess('');
        setAmbulanceDetails('');
        setSelectedTransferInTransit(null);
        loadMyTransfers();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark in transit');
    } finally {
      setLoading(false);
    }
  };

  // Complete transfer
  const handleCompleteTransfer = async (transferId) => {
    try {
      setLoading(true);
      setError('');

      await completePatientTransfer(transferId);

      setSuccess('Transfer completed!');
      setTimeout(() => {
        setSuccess('');
        loadMyTransfers();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete transfer');
    } finally {
      setLoading(false);
    }
  };

  const getTransferStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-sm',
      approved: 'text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm',
      in_transit: 'text-purple-600 bg-purple-50 px-3 py-1 rounded-full text-sm',
      completed: 'text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm',
      rejected: 'text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm',
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Patient Transfers</h1>
            <p className="text-gray-600 mt-1">
              Request and manage hospital-to-hospital patient transfers
            </p>
          </div>
          <button
            onClick={() => navigate('/hospital-dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'search'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Request Transfer
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'pending'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Pending Requests
          </button>
          <button
            onClick={() => setActiveTab('my-transfers')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'my-transfers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            My Transfers
          </button>
        </div>

        {/* Search for Hospital Tab */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Search Hospitals by Specialty
            </h2>

            {/* Search Form */}
            <form onSubmit={handleSearchHospitals} className="mb-6">
              <div className="flex gap-4">
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select specialty</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Gynecology">Gynecology</option>
                  </select>
                  <button
                    type="submit"
                    disabled={loading || !specialty}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
            </form>

            {/* Hospital Results */}
            {searchResults.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Available Hospitals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((hospital) => (
                    <div
                      key={hospital._id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedHospital?._id === hospital._id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                      onClick={() => handleSelectHospital(hospital)}
                    >
                      <h4 className="font-bold text-gray-800">{hospital.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {hospital.contact?.phone || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {hospital.address || 'N/A'}
                      </p>
                      <p className="text-sm text-blue-600 mt-2 font-semibold">
                        {hospital.distance ? `${hospital.distance.toFixed(1)} km away` : 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patient Selection */}
            {selectedHospital && patients.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  Select Patient(s) to Transfer
                </h3>
                <div className="space-y-2 mb-6">
                  {patients.map((patient) => (
                    <label
                      key={patient._id}
                      className="flex items-start p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="patient"
                        value={patient._id}
                        checked={selectedPatients.includes(patient._id)}
                        onChange={() => {
                          if (selectedPatients.includes(patient._id)) {
                            setSelectedPatients(selectedPatients.filter((id) => id !== patient._id));
                          } else {
                            setSelectedPatients([...selectedPatients, patient._id]);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 mt-1"
                      />
                      <div className="ml-4 flex-1">
                        <p className="font-semibold text-gray-800">{patient.patientName || patient.name || 'Unnamed'}</p>
                        <p className="text-sm text-gray-600">
                          {patient.age} yrs • {patient.gender || 'N/A'} • {patient.condition || patient.medicalCondition || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Contact: {patient.contact || 'N/A'}</p>
                        {patient.medicalHistory && (
                          <p className="text-sm text-gray-600 mt-1">History: {patient.medicalHistory}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {/* Transfer Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Transfer Notes
                  </label>
                  <textarea
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="Add any additional notes about the transfer..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                  />
                </div>

                {/* Initiate Transfer Button */}
                <button
                  onClick={handleInitiateTransfer}
                  disabled={loading || selectedPatients.length === 0}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-green-400 font-semibold"
                >
                  {loading ? 'Processing...' : 'Initiate Transfer'}
                </button>
              </div>
            )}

            {selectedHospital && patients.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-600">
                No patients ready for transfer
              </div>
            )}
          </div>
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Pending Transfer Requests</h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : pendingTransfers.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                No pending transfer requests
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTransfers.map((transfer) => (
                  <div
                    key={transfer._id}
                    className="p-4 border border-gray-300 rounded-lg hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-gray-800">
                          {transfer.patient?.name || 'Unknown Patient'}
                        </p>
                        <p className="text-sm text-gray-600">
                          From: {transfer.sendingHospital?.name || 'Unknown'}
                        </p>
                      </div>
                      <span className={getTransferStatusColor(transfer.status)}>
                        {transfer.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">
                      <strong>Condition:</strong> {transfer.patient?.medicalCondition}
                    </p>

                    {selectedTransferToReject === transfer._id ? (
                      <div className="mb-3">
                        <textarea
                          value={reasonForReject}
                          onChange={(e) => setReasonForReject(e.target.value)}
                          placeholder="Reason for rejection..."
                          className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                          rows="3"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectTransfer(transfer._id)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            Confirm Reject
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransferToReject(null);
                              setReasonForReject('');
                            }}
                            className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveTransfer(transfer._id)}
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-green-400 text-sm font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTransferToReject(transfer._id);
                            setReasonForReject('');
                          }}
                          className="flex-1 px-4 py-2 bg-red-200 text-red-700 rounded hover:bg-red-300 transition text-sm font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* User Transfer Requests Section */}
            {userTransferRequests.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-300">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Patient Transfer Requests (from Users)</h3>
                <div className="space-y-4">
                  {userTransferRequests.map((transfer) => (
                    <div
                      key={transfer._id}
                      className="p-4 border border-orange-300 rounded-lg bg-orange-50 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-gray-800">Patient Transfer Request</p>
                          <p className="text-sm text-gray-600">
                            Current Hospital: {transfer.currentHospital || 'Not specified'}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-semibold">
                          {transfer.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <p className="text-gray-600"><strong>Condition:</strong> {transfer.patientCondition}</p>
                        </div>
                        <div>
                          <p className="text-gray-600"><strong>Required Resources:</strong> {transfer.requiredResources?.join(', ') || 'None'}</p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 mb-3">
                        Requested on: {new Date(transfer.createdAt).toLocaleDateString()}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedUserTransfer(selectedUserTransfer?._id === transfer._id ? null : transfer)}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-semibold transition"
                        >
                          {selectedUserTransfer?._id === transfer._id ? 'Hide Details' : 'View Request'}
                        </button>
                      </div>

                      {/* Expanded Details */}
                      {selectedUserTransfer?._id === transfer._id && (
                        <div className="mt-4 pt-4 border-t border-orange-200">
                          <div className="bg-white p-3 rounded mb-3 text-sm">
                            <p className="text-gray-700 mb-2"><strong>Status:</strong> {transfer.status}</p>
                            <p className="text-gray-700 mb-2"><strong>Requested On:</strong> {new Date(transfer.createdAt).toLocaleString()}</p>
                            {transfer.estimatedETA && <p className="text-gray-700"><strong>ETA:</strong> {transfer.estimatedETA}</p>}
                          </div>

                          {transfer.status === 'pending' && !selectedTransferToReject && (
                            <div className="flex gap-2 mb-3">
                              <button
                                onClick={() => handleApproveUserTransfer(transfer._id)}
                                disabled={loading}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold transition disabled:bg-green-400"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => setSelectedTransferToReject(transfer._id)}
                                className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-semibold transition"
                              >
                                ✗ Reject
                              </button>
                            </div>
                          )}

                          {selectedTransferToReject === transfer._id && (
                            <div className="mb-3">
                              <textarea
                                value={userTransferRejectReason}
                                onChange={(e) => setUserTransferRejectReason(e.target.value)}
                                placeholder="Reason for rejection..."
                                className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-sm"
                                rows="2"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRejectUserTransfer(transfer._id)}
                                  disabled={loading}
                                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-semibold transition disabled:bg-red-400"
                                >
                                  Confirm Reject
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTransferToReject(null);
                                    setUserTransferRejectReason('');
                                  }}
                                  className="flex-1 px-3 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm font-semibold transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {transfer.status !== 'pending' && (
                            <div className="text-center text-sm text-gray-600 p-3 bg-gray-50 rounded">
                              This request has already been {transfer.status}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Transfers Tab */}
        {activeTab === 'my-transfers' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">My Transfer Requests</h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : myTransfers.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                No transfer requests initiated
              </div>
            ) : (
              <div className="space-y-4">
                {myTransfers.map((transfer) => (
                  <div
                    key={transfer._id}
                    className="p-4 border border-gray-300 rounded-lg hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-gray-800">
                          {transfer.patient?.name || 'Unknown Patient'}
                        </p>
                        <p className="text-sm text-gray-600">
                          To: {transfer.receivingHospital?.name || 'Unknown'}
                        </p>
                      </div>
                      <span className={getTransferStatusColor(transfer.status)}>
                        {transfer.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Condition:</strong> {transfer.patient?.medicalCondition}
                    </p>

                    {transfer.status === 'rejected' && transfer.rejectionReason && (
                      <p className="text-sm text-red-600 mb-3">
                        <strong>Rejection Reason:</strong> {transfer.rejectionReason}
                      </p>
                    )}

                    {transfer.eta && (
                      <p className="text-sm text-gray-700 mb-3">
                        <strong>ETA:</strong> {transfer.eta} hours
                      </p>
                    )}

                    {transfer.status === 'approved' &&
                      selectedTransferInTransit === transfer._id ? (
                      <div className="mb-3">
                        <textarea
                          value={ambulanceDetails}
                          onChange={(e) => setAmbulanceDetails(e.target.value)}
                          placeholder="Enter ambulance details (vehicle number, driver name, etc.)..."
                          className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                          rows="3"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMarkInTransit(transfer._id)}
                            disabled={loading}
                            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                          >
                            Confirm In Transit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransferInTransit(null);
                              setAmbulanceDetails('');
                            }}
                            className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {transfer.status === 'approved' &&
                      selectedTransferInTransit !== transfer._id && (
                      <button
                        onClick={() => setSelectedTransferInTransit(transfer._id)}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition disabled:bg-purple-400 text-sm font-semibold"
                      >
                        Mark In Transit
                      </button>
                    )}

                    {transfer.status === 'in_transit' && (
                      <button
                        onClick={() => handleCompleteTransfer(transfer._id)}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-green-400 text-sm font-semibold"
                      >
                        Complete Transfer
                      </button>
                    )}

                    {transfer.inTransitDetails && (
                      <p className="text-sm text-gray-700 mt-3">
                        <strong>Ambulance Details:</strong> {transfer.inTransitDetails}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
