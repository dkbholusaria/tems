import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { Client } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ClientManagementModalProps {
  onClose: () => void;
}

const ClientManagementModal: React.FC<ClientManagementModalProps> = ({ onClose }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newClientId, setNewClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // State for inline editing
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Fetch existing clients
  useEffect(() => {
    const unsubscribe = db.collection('Clients')
      .orderBy('clientId')
      .onSnapshot(snapshot => {
        const fetchedClients: Client[] = [];
        snapshot.forEach(doc => {
          // Store the firestore doc ID for easy updates
          fetchedClients.push({ docId: doc.id, ...doc.data() } as Client);
        });
        setClients(fetchedClients);
        setIsLoading(false);
      }, err => {
        console.error("Error fetching clients:", err);
        setError("Could not load client list.");
        setIsLoading(false);
      });
    
    return () => unsubscribe();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientId || !newClientName) {
      setAddError("Both Client ID and Name are required.");
      return;
    }
    
    const alreadyExists = clients.some(c => c.clientId.toLowerCase() === newClientId.toLowerCase());
    if (alreadyExists) {
        setAddError(`Client ID "${newClientId}" already exists.`);
        return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const newClient: Omit<Client, 'docId'> = {
        clientId: newClientId.toUpperCase(),
        clientName: newClientName,
      };
      await db.collection('Clients').add(newClient);
      setNewClientId('');
      setNewClientName('');
    } catch (err) {
      console.error("Error adding client:", err);
      setAddError("Failed to add client. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  // Handlers for editing a client's name
  const handleEdit = (client: Client) => {
    setEditingClientId(client.clientId);
    setEditingClientName(client.clientName);
    setUpdateError(null);
  };

  const handleCancel = () => {
    setEditingClientId(null);
    setEditingClientName('');
  };

  const handleUpdate = async () => {
    if (!editingClientId || !editingClientName) return;

    const clientToUpdate = clients.find(c => c.clientId === editingClientId);
    if (!clientToUpdate || !clientToUpdate.docId) {
      setUpdateError("Could not find client document to update.");
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    try {
      await db.collection('Clients').doc(clientToUpdate.docId).update({
        clientName: editingClientName,
      });
      handleCancel(); // Exit editing mode
    } catch (err) {
      console.error("Error updating client:", err);
      setUpdateError("Failed to update client.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center pb-3 border-b">
          <h3 className="text-lg font-medium text-gray-900">Manage Clients</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        <div className="mt-4 flex flex-col md:flex-row gap-8">
          {/* Add New Client Form */}
          <div className="w-full md:w-1/3">
            <h4 className="font-semibold text-gray-800 mb-2">Add New Client</h4>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">Client ID</label>
                <input
                  id="clientId"
                  type="text"
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  placeholder="e.g., CL001"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">Client Name</label>
                <input
                  id="clientName"
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g., Acme Corporation"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <button
                type="submit"
                disabled={isAdding}
                className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isAdding ? 'Adding...' : 'Add Client'}
              </button>
            </form>
          </div>

          {/* Existing Clients List */}
          <div className="w-full md:w-2/3">
             <h4 className="font-semibold text-gray-800 mb-2">Existing Clients</h4>
             <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                {isLoading ? <div className="p-8 flex justify-center"><LoadingSpinner/></div> :
                 error ? <p className="p-4 text-red-500">{error}</p> :
                 clients.length === 0 ? <p className="p-4 text-gray-500">No clients have been added yet.</p> :
                 (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client ID</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client Name</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {clients.map(client => (
                                <tr key={client.clientId}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{client.clientId}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {editingClientId === client.clientId ? (
                                        <input 
                                          type="text"
                                          value={editingClientName}
                                          onChange={(e) => setEditingClientName(e.target.value)}
                                          className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm"
                                        />
                                      ) : (
                                        client.clientName
                                      )}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                      {editingClientId === client.clientId ? (
                                        <>
                                          <button onClick={handleUpdate} disabled={isUpdating} className="text-green-600 hover:text-green-900 disabled:text-gray-400">
                                            {isUpdating ? 'Saving...' : 'Save'}
                                          </button>
                                          <button onClick={handleCancel} disabled={isUpdating} className="text-gray-600 hover:text-gray-900">
                                            Cancel
                                          </button>
                                        </>
                                      ) : (
                                        <button onClick={() => handleEdit(client)} className="text-indigo-600 hover:text-indigo-900">
                                          Edit
                                        </button>
                                      )}
                                    </td>
                                </tr>
                            ))}
                             {updateError && (
                              <tr><td colSpan={3} className="text-center text-red-600 text-sm py-2">{updateError}</td></tr>
                            )}
                        </tbody>
                    </table>
                 )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientManagementModal;