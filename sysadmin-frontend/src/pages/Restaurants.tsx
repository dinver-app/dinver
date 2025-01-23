import { useState, useEffect } from "react";
import {
  getAllRestaurants,
  createRestaurant,
} from "../services/restaurantService";
import { Restaurant } from "../interfaces/Interfaces";

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setModalOpen] = useState(false);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [newRestaurant, setNewRestaurant] = useState<Restaurant>({
    name: "",
    address: "",
  });

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRestaurants(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const fetchRestaurants = async (page: number, search: string) => {
    try {
      const data = await getAllRestaurants(page, search);
      setRestaurants(data.restaurants);
      setTotalPages(data.totalPages);
      setTotalRestaurants(data.totalRestaurants);
    } catch (error) {
      console.error("Failed to fetch restaurants", error);
    }
  };

  const handleCreateRestaurant = async () => {
    try {
      await createRestaurant(newRestaurant);
      setModalOpen(false);
      fetchRestaurants(currentPage, searchTerm);
    } catch (error) {
      console.error("Failed to create restaurant", error);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">Restaurants</h1>
        <h3 className="page-subtitle">Manage your restaurant listings.</h3>
      </div>
      <div className="h-line mb-4"></div>
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search restaurants"
          className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
        />
        <button onClick={() => setModalOpen(true)} className="primary-button">
          Add Restaurant
        </button>
      </div>
      <div className="rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr className="text-sm text-black">
              <th className="py-2 px-4 text-left font-normal w-32">Name</th>
              <th className="py-2 px-4 text-left font-normal w-48">Address</th>
              <th className="py-2 px-4 text-center font-normal w-20">Rating</th>
              <th className="py-2 px-4 text-center font-normal w-20">
                Is Open
              </th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((restaurant: Restaurant) => (
              <tr
                key={restaurant.name}
                className="hover:bg-gray-100 border-b border-gray-200"
              >
                <td className="py-3 px-4 text-sm w-32">{restaurant.name}</td>
                <td className="py-3 px-4 text-sm w-48">{restaurant.address}</td>
                <td className="py-3 px-4 text-sm text-center w-20">
                  {restaurant.rating !== undefined && restaurant.rating !== null
                    ? restaurant.rating.toFixed(1)
                    : "-"}
                </td>
                <td className="py-3 px-4 text-sm w-20">
                  <div
                    className={`w-4 h-4 mx-auto rounded-full ${
                      restaurant.isOpen ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm">
          {(currentPage - 1) * 10 + 1} -{" "}
          {Math.min(currentPage * 10, totalPages)} of {totalRestaurants}
        </span>
        <div className="flex space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            &lt;
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            &gt;
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-4">Add Restaurant</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                value={newRestaurant.name}
                onChange={(e) =>
                  setNewRestaurant({ ...newRestaurant, name: e.target.value })
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                value={newRestaurant.address}
                onChange={(e) =>
                  setNewRestaurant({
                    ...newRestaurant,
                    address: e.target.value,
                  })
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRestaurant}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Restaurant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Restaurants;
