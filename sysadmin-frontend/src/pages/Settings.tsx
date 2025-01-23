import { useEffect, useState } from "react";
import {
  listSysadmins,
  addSysadmin,
  removeSysadmin,
} from "../services/sysadminService";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Sysadmin {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: User;
}

const Settings = () => {
  const [sysadmins, setSysadmins] = useState<Sysadmin[]>([]);
  const [newSysadminEmail, setNewSysadminEmail] = useState("");
  const [error, setError] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchSysadmins();
  }, []);

  const fetchSysadmins = async () => {
    try {
      const data = await listSysadmins();
      setSysadmins(data);
    } catch (error) {
      setError("Failed to fetch sysadmins");
    }
  };

  const handleAddSysadmin = async () => {
    try {
      await addSysadmin(newSysadminEmail);
      setNewSysadminEmail("");
      setModalOpen(false);
      fetchSysadmins();
    } catch (error) {
      setError("Failed to add sysadmin");
    }
  };

  const handleRemoveSysadmin = async (userId: string) => {
    try {
      await removeSysadmin(userId);
      fetchSysadmins();
    } catch (error) {
      setError("Failed to remove sysadmin");
    }
  };

  return (
    <div className=" mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Sysadmin Users</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Add Sysadmin
        </button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b dark:border-gray-700">ID</th>
            <th className="py-2 px-4 border-b dark:border-gray-700">Email</th>
            <th className="py-2 px-4 border-b dark:border-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sysadmins.map((sysadmin) => (
            <tr key={sysadmin.id}>
              <td className="py-2 px-4 border-b dark:border-gray-700">
                {sysadmin.id}
              </td>
              <td className="py-2 px-4 border-b dark:border-gray-700">
                {sysadmin.user.email}
              </td>
              <td className="py-2 px-4 border-b dark:border-gray-700">
                <button
                  onClick={() => handleRemoveSysadmin(sysadmin.userId)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-md shadow-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Add New Sysadmin</h2>
            <input
              type="email"
              value={newSysadminEmail}
              onChange={(e) => setNewSysadminEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full p-2 border border-gray-300 rounded mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSysadmin}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
