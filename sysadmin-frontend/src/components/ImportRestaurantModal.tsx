import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  importRestaurantFromUrl,
  searchGooglePlaces,
  getGooglePlaceDetails,
  createRestaurantFromGoogle,
  GooglePlaceResult,
  RestaurantDataFromGoogle,
} from '../services/googlePlacesService';

interface ImportRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportMode = 'url' | 'search';

const ImportRestaurantModal: React.FC<ImportRestaurantModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<ImportMode>('url');
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [restaurantData, setRestaurantData] = useState<RestaurantDataFromGoogle | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  if (!isOpen) return null;

  const handleReset = () => {
    setUrlInput('');
    setSearchQuery('');
    setSearchResults([]);
    setRestaurantData(null);
    setStep('input');
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleImportFromUrl = async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a Google Maps URL');
      return;
    }

    setLoading(true);
    try {
      const data = await importRestaurantFromUrl(urlInput);
      setRestaurantData(data.restaurantData);
      setStep('preview');
      toast.success('Restaurant data fetched successfully!');
    } catch (error: any) {
      console.error('Error importing from URL:', error);
      if (error.response?.status === 409) {
        toast.error('This restaurant already exists in the database!');
      } else {
        toast.error(error.response?.data?.details || 'Failed to import restaurant');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a restaurant name');
      return;
    }

    setLoading(true);
    try {
      const data = await searchGooglePlaces(searchQuery);
      setSearchResults(data.results);
      if (data.results.length === 0) {
        toast.error('No restaurants found');
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Failed to search restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlace = async (placeId: string) => {
    setLoading(true);
    try {
      const data = await getGooglePlaceDetails(placeId);
      setRestaurantData(data.restaurantData);
      setStep('preview');
      toast.success('Restaurant data fetched successfully!');
    } catch (error: any) {
      console.error('Error getting place details:', error);
      if (error.response?.status === 409) {
        toast.error('This restaurant already exists in the database!');
      } else {
        toast.error('Failed to get restaurant details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestaurant = async () => {
    if (!restaurantData) return;

    setLoading(true);
    try {
      const result = await createRestaurantFromGoogle(restaurantData.placeId);
      toast.success(`Restaurant "${result.restaurant.name}" created successfully!`);
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating restaurant:', error);
      if (error.response?.status === 409) {
        toast.error('This restaurant already exists in the database!');
      } else {
        toast.error(error.response?.data?.details || 'Failed to create restaurant');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Import Restaurant from Google
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {step === 'input' ? (
            <>
              {/* Mode Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-200">
                <button
                  onClick={() => setMode('url')}
                  className={`px-4 py-2 font-medium transition ${
                    mode === 'url'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Import from URL
                </button>
                <button
                  onClick={() => setMode('search')}
                  className={`px-4 py-2 font-medium transition ${
                    mode === 'search'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Search by Name
                </button>
              </div>

              {/* URL Import Mode */}
              {mode === 'url' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Maps Share Link
                    </label>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://maps.app.goo.gl/... or full Google Maps URL"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && handleImportFromUrl()}
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Paste the Google Maps share link (goo.gl) or full restaurant URL
                    </p>
                  </div>
                  <button
                    onClick={handleImportFromUrl}
                    disabled={loading || !urlInput.trim()}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Importing...' : 'Import Restaurant'}
                  </button>
                </div>
              )}

              {/* Search Mode */}
              {mode === 'search' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Restaurant Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g. Pop's Pizza & Sport"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <button
                        onClick={handleSearch}
                        disabled={loading || !searchQuery.trim()}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {loading ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="border border-gray-200 rounded-lg divide-y max-h-96 overflow-y-auto">
                      {searchResults.map((result) => (
                        <div
                          key={result.placeId}
                          className={`p-4 hover:bg-gray-50 transition ${
                            result.existsInDatabase ? 'opacity-50' : 'cursor-pointer'
                          }`}
                          onClick={() => !result.existsInDatabase && handleSelectPlace(result.placeId)}
                        >
                          <div className="flex items-start gap-4">
                            {result.photoUrl && (
                              <img
                                src={result.photoUrl}
                                alt={result.name}
                                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-base">{result.name}</h3>
                              <p className="text-sm text-gray-600 mt-0.5">{result.address}</p>
                              {result.place && (
                                <p className="text-sm font-medium text-blue-600 mt-0.5">
                                  📍 {result.place}
                                </p>
                              )}
                              {result.rating && (
                                <div className="flex items-center gap-1 mt-1.5">
                                  <span className="text-yellow-500">★</span>
                                  <span className="text-sm font-medium">{result.rating.toFixed(1)}</span>
                                  {result.userRatingsTotal && (
                                    <span className="text-sm text-gray-500">
                                      ({result.userRatingsTotal} reviews)
                                    </span>
                                  )}
                                </div>
                              )}
                              {result.existsInDatabase && (
                                <span className="inline-block mt-2 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                                  Already in database
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Preview Step */
            restaurantData && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Preview Restaurant Data</h3>
                  <p className="text-sm text-blue-700">
                    Review the information below before creating the restaurant.
                  </p>
                </div>

                {restaurantData.previewPhotoUrl && (
                  <img
                    src={restaurantData.previewPhotoUrl}
                    alt={restaurantData.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-base font-semibold text-gray-900">{restaurantData.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">City</label>
                    <p className="text-base text-gray-900">{restaurantData.place || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Country</label>
                    <p className="text-base text-gray-900">{restaurantData.country || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-base text-gray-900">{restaurantData.address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-base text-gray-900">{restaurantData.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Website</label>
                    <p className="text-base text-gray-900 truncate">
                      {restaurantData.websiteUrl || 'N/A'}
                    </p>
                  </div>
                  {restaurantData.priceLevel && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Price Level</label>
                      <p className="text-base text-gray-900">{'€'.repeat(restaurantData.priceLevel)}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600">Coordinates</label>
                    <p className="text-base text-gray-900">
                      {restaurantData.latitude.toFixed(6)}, {restaurantData.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => setStep('input')}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateRestaurant}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Creating...' : 'Create Restaurant'}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportRestaurantModal;
