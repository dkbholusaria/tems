import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { Client, Project, UserMaster, Role } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface CompanyManagementModalProps {
  onClose: () => void;
}

type ActiveTab = 'clients' | 'projects' | 'employees';

const CompanyManagementModal: React.FC<CompanyManagementModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('clients');

  // Unified state for all data to prevent re-fetching on tab switch
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all company data once on mount
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const clientsPromise = db.collection('Clients').orderBy('clientId').get();
        const projectsPromise = db.collection('Projects').orderBy('projectId').get();
        // FIX: The user's UID is needed for updates, so fetch the doc ID.
        const usersPromise = db.collection('UserMaster').orderBy('name').get();

        const [clientsSnapshot, projectsSnapshot, usersSnapshot] = await Promise.all([clientsPromise, projectsPromise, usersPromise]);
        
        const fetchedClients: Client[] = [];
        clientsSnapshot.forEach(doc => fetchedClients.push({ docId: doc.id, ...doc.data() } as Client));
        setClients(fetchedClients);

        const fetchedProjects: Project[] = [];
        projectsSnapshot.forEach(doc => fetchedProjects.push({ docId: doc.id, ...doc.data() } as Project));
        setProjects(fetchedProjects);

        const fetchedUsers: UserMaster[] = [];
        // FIX: Capture the document ID as the UID.
        usersSnapshot.forEach(doc => fetchedUsers.push({ uid: doc.id, ...doc.data() } as UserMaster));
        setUsers(fetchedUsers);

      } catch (err) {
        console.error("Error fetching company data:", err);
        setError("Could not load company data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <div className="p-8 flex justify-center"><LoadingSpinner/></div>;
    }
    if (error) {
      return <p className="p-4 text-red-500">{error}</p>;
    }
    switch (activeTab) {
      case 'clients': return <ClientsTab clients={clients} setClients={setClients} />;
      case 'projects': return <ProjectsTab projects={projects} setProjects={setProjects} clients={clients} />;
      case 'employees': return <EmployeesTab users={users} setUsers={setUsers} />;
      default: return null;
    }
  };

  const TabButton: React.FC<{ tab: ActiveTab, label: string }> = ({ tab, label }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm font-medium rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
      >
        {label}
      </button>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white">
        <div className="relative text-center -mx-5 -mt-5 mb-5 p-4 border-b border-gray-200 rounded-t-md bg-slate-100">
            <h3 className="text-xl font-semibold text-slate-800">Manage Company</h3>
            <button
                onClick={onClose}
                className="absolute top-1/2 right-4 -translate-y-1/2 bg-red-100 text-red-600 rounded-full h-8 w-8 flex items-center justify-center shadow-sm hover:bg-red-200 hover:text-red-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div>
          <div className="flex space-x-2 border-b mb-4">
            <TabButton tab="clients" label="Clients" />
            <TabButton tab="projects" label="Projects" />
            <TabButton tab="employees" label="Employees" />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================================
// TABS as separate components for clarity
// =================================================================================

// CLIENTS TAB
const ClientsTab: React.FC<{ clients: Client[], setClients: React.Dispatch<React.SetStateAction<Client[]>> }> = ({ clients, setClients }) => {
  const [newClientId, setNewClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientId || !newClientName) { setAddError("Both fields are required."); return; }
    if (clients.some(c => c.clientId.toLowerCase() === newClientId.toLowerCase())) { setAddError("Client ID already exists."); return; }
    setIsAdding(true); setAddError(null);
    try {
      const newClient: Omit<Client, 'docId'> = { clientId: newClientId.toUpperCase(), clientName: newClientName };
      const docRef = await db.collection('Clients').add(newClient);
      setClients(prev => [...prev, { docId: docRef.id, ...newClient }].sort((a, b) => a.clientId.localeCompare(b.clientId)));
      setNewClientId(''); setNewClientName('');
    } catch (err) { setAddError("Failed to add client."); } finally { setIsAdding(false); }
  };

  const handleUpdate = async () => {
    if (!editingClientId || !editingClientName) return;
    const clientToUpdate = clients.find(c => c.clientId === editingClientId);
    if (!clientToUpdate?.docId) { setUpdateError("Could not find client to update."); return; }
    setIsUpdating(true); setUpdateError(null);
    try {
      await db.collection('Clients').doc(clientToUpdate.docId).update({ clientName: editingClientName });
      setClients(prev => prev.map(c => c.clientId === editingClientId ? { ...c, clientName: editingClientName } : c));
      setEditingClientId(null);
    } catch (err) { setUpdateError("Failed to update client."); } finally { setIsUpdating(false); }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="w-full md:w-1/3">
        <h4 className="font-semibold text-gray-800 mb-2">Add New Client</h4>
        <form onSubmit={handleAddClient} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Client ID</label>
            <input value={newClientId} onChange={(e) => setNewClientId(e.target.value)} placeholder="e.g., CL001" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Client Name</label>
            <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="e.g., Acme Corp" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <button type="submit" disabled={isAdding} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400">{isAdding ? 'Adding...' : 'Add Client'}</button>
        </form>
      </div>
      <div className="w-full md:w-2/3">
        <h4 className="font-semibold text-gray-800 mb-2">Existing Clients</h4>
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map(client => (
                <tr key={client.clientId}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{client.clientId}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{editingClientId === client.clientId ? <input value={editingClientName} onChange={e => setEditingClientName(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md"/> : client.clientName}</td>
                  <td className="px-4 py-2 text-center text-sm font-medium space-x-2">
                    {editingClientId === client.clientId ? (<><button onClick={handleUpdate} disabled={isUpdating} className="text-green-600 hover:text-green-900">{isUpdating ? 'Saving...' : 'Save'}</button><button onClick={() => setEditingClientId(null)} className="text-gray-600 hover:text-gray-900">Cancel</button></>) : (<button onClick={() => { setEditingClientId(client.clientId); setEditingClientName(client.clientName); }} className="text-indigo-600 hover:text-indigo-900">Edit</button>)}
                  </td>
                </tr>
              ))}
              {updateError && <tr><td colSpan={3} className="text-center text-red-600 text-sm py-2">{updateError}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// PROJECTS TAB
const ProjectsTab: React.FC<{ projects: Project[], setProjects: React.Dispatch<React.SetStateAction<Project[]>>, clients: Client[] }> = ({ projects, setProjects, clients }) => {
    const [newClientCode, setNewClientCode] = useState(clients[0]?.clientId || '');
    const [newProjectId, setNewProjectId] = useState('');
    const [newTravelCode, setNewTravelCode] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientCode || !newProjectId || !newDescription) { setAddError("Client, Project ID, and Description are required."); return; }
        if (projects.some(p => p.projectId.toLowerCase() === newProjectId.toLowerCase())) { setAddError("Project ID already exists."); return; }
        setIsAdding(true); setAddError(null);
        try {
            const newProject: Omit<Project, 'docId'> = { clientCode: newClientCode, projectId: newProjectId.toUpperCase(), projectCode: newProjectId.toUpperCase(), travelCode: newTravelCode.toUpperCase(), description: newDescription };
            const docRef = await db.collection('Projects').add(newProject);
            setProjects(prev => [...prev, { docId: docRef.id, ...newProject }].sort((a,b) => a.projectId.localeCompare(b.projectId)));
            setNewProjectId(''); setNewTravelCode(''); setNewDescription('');
        } catch (err) { setAddError("Failed to add project."); } finally { setIsAdding(false); }
    };
    
    const clientsMap = new Map(clients.map(c => [c.clientId, c.clientName]));

    return (
        <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3">
                <h4 className="font-semibold text-gray-800 mb-2">Add New Project</h4>
                <form onSubmit={handleAddProject} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Client</label>
                        <select value={newClientCode} onChange={e => setNewClientCode(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
                            {clients.map(c => <option key={c.clientId} value={c.clientId}>{c.clientName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Project ID</label>
                        <input value={newProjectId} onChange={e => setNewProjectId(e.target.value)} placeholder="Unique project code" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Travel Code</label>
                        <input value={newTravelCode} onChange={e => setNewTravelCode(e.target.value)} placeholder="e.g., AUD-MUMBAI" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Project description" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                    {addError && <p className="text-sm text-red-600">{addError}</p>}
                    <button type="submit" disabled={isAdding} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400">{isAdding ? 'Adding...' : 'Add Project'}</button>
                </form>
            </div>
            <div className="w-full md:w-2/3">
                <h4 className="font-semibold text-gray-800 mb-2">Existing Projects</h4>
                <div className="border rounded-lg overflow-hidden">
                     <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project ID</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {projects.map(p => (
                                <tr key={p.projectId}><td className="px-4 py-2 text-sm font-medium text-gray-900">{p.projectId}</td><td className="px-4 py-2 text-sm text-gray-500">{clientsMap.get(p.clientCode) || p.clientCode}</td><td className="px-4 py-2 text-sm text-gray-500">{p.description}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// EMPLOYEES TAB
const EmployeesTab: React.FC<{ users: UserMaster[], setUsers: React.Dispatch<React.SetStateAction<UserMaster[]>> }> = ({ users, setUsers }) => {
    // NEW: States for unified inline editing
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [editedUserData, setEditedUserData] = useState<{ name: string; mobile: string; role: Role } | null>(null);
    const [updatingUids, setUpdatingUids] = useState<Set<string>>(new Set());
    const [updateError, setUpdateError] = useState<string|null>(null);
    
    // States for password management
    const [resetFeedback, setResetFeedback] = useState<string|null>(null);
    const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
    const [userToSetPassword, setUserToSetPassword] = useState<UserMaster | null>(null);
    const [newPassword, setNewPassword] = useState('');

    // States for adding a new user
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserMobile, setNewUserMobile] = useState(''); // NEW
    const [newUserRole, setNewUserRole] = useState<Role>(Role.EMPLOYEE);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [addUserError, setAddUserError] = useState<string|null>(null);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserName || !newUserEmail || !newUserPassword) { setAddUserError("Name, email, and password are required."); return; }
        setIsAddingUser(true); setAddUserError(null);
        try {
            // NOTE: In a real app, a Cloud Function would be called here to create the user in Firebase Auth.
            // This implementation only adds the user to the Firestore `UserMaster` collection for management.
            const newUserForDb: Omit<UserMaster, 'uid'> = { name: newUserName, email: newUserEmail, role: newUserRole, mobile: newUserMobile };
            const docRef = await db.collection('UserMaster').add(newUserForDb);
            setUsers(prev => [...prev, { uid: docRef.id, ...newUserForDb }].sort((a,b) => a.name.localeCompare(b.name)));
            setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserMobile('');
        } catch (err) {
            console.error("Error adding user profile:", err);
            setAddUserError("Failed to create user profile in database.");
        } finally {
            setIsAddingUser(false);
        }
    };
    
    // Handlers for unified inline editing
    const handleEdit = (user: UserMaster) => {
        setEditingUid(user.uid);
        setEditedUserData({ name: user.name, mobile: user.mobile || '', role: user.role });
    };

    const handleCancel = () => {
        setEditingUid(null);
        setEditedUserData(null);
    };
    
    const handleSave = async (uid: string) => {
        if (!editedUserData) return;
        setUpdatingUids(prev => new Set(prev).add(uid));
        setUpdateError(null);
        try {
            await db.collection('UserMaster').doc(uid).update({
                name: editedUserData.name,
                mobile: editedUserData.mobile,
                role: editedUserData.role,
            });
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...editedUserData } : u));
            handleCancel(); // Exit editing mode
        } catch(err) {
            console.error("Error updating user:", err);
            setUpdateError(`Failed to update user ${uid}.`);
        } finally {
            setUpdatingUids(prev => { const newSet = new Set(prev); newSet.delete(uid); return newSet; });
        }
    };
    
    // Handlers for password management
    const handlePasswordReset = async (email: string) => {
        if (!window.confirm(`Are you sure you want to send a password reset email to ${email}?`)) return;
        setResetFeedback(null);
        try {
            await auth.sendPasswordResetEmail(email);
            setResetFeedback(`Password reset email sent successfully to ${email}.`);
        } catch (err: any) {
            console.error("Password reset error:", err);
            setResetFeedback(`Error: ${err.message}`);
        }
    };

    const openSetPasswordModal = (user: UserMaster) => {
        setUserToSetPassword(user);
        setIsSetPasswordModalOpen(true);
        setNewPassword('');
    };

    const handleConfirmSetPassword = () => {
        alert("Security Restriction: This action requires a secure backend function and is disabled in the UI. Please use the 'Reset Password' email method.");
        setIsSetPasswordModalOpen(false);
    };
    
    return (
        <>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3">
                    <h4 className="font-semibold text-gray-800 mb-2">Add New Employee</h4>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mobile</label>
                            <input value={newUserMobile} onChange={(e) => setNewUserMobile(e.target.value)} placeholder="e.g. +91..." className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Initial Password</label>
                            <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as Role)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
                                <option value={Role.EMPLOYEE}>Employee</option><option value={Role.EMPLOYER}>Employer</option>
                            </select>
                        </div>
                        {addUserError && <p className="text-sm text-red-600">{addUserError}</p>}
                        <button type="submit" disabled={isAddingUser} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400">{isAddingUser ? 'Adding...' : 'Add Employee'}</button>
                    </form>
                </div>
                <div className="w-full md:w-2/3">
                    <h4 className="font-semibold text-gray-800 mb-2">Manage Employees</h4>
                    {resetFeedback && <p className="text-sm text-blue-600 p-2 bg-blue-50 rounded-md mb-2">{resetFeedback}</p>}
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th><th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map(user => {
                                    const isEditing = editingUid === user.uid;
                                    return (
                                        <tr key={user.uid}>
                                            <td className="px-4 py-2 text-sm text-gray-900">{isEditing ? <input value={editedUserData?.name} onChange={e => setEditedUserData(d => ({...d!, name: e.target.value}))} className="w-full px-2 py-1 border rounded-md"/> : user.name}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{user.email}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{isEditing ? <input value={editedUserData?.mobile} onChange={e => setEditedUserData(d => ({...d!, mobile: e.target.value}))} className="w-full px-2 py-1 border rounded-md"/> : user.mobile || 'N/A'}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{isEditing ? <select value={editedUserData?.role} onChange={e => setEditedUserData(d => ({...d!, role: e.target.value as Role}))} className="w-full px-2 py-1 border rounded-md"><option value={Role.EMPLOYEE}>Employee</option><option value={Role.EMPLOYER}>Employer</option></select> : user.role}</td>
                                            <td className="px-4 py-2 text-center text-sm font-medium">
                                                <div className="flex justify-center items-center gap-2 flex-wrap">
                                                    {isEditing ? (
                                                        <>
                                                            <button onClick={() => handleSave(user.uid)} disabled={updatingUids.has(user.uid)} className="text-green-600 hover:text-green-900">{updatingUids.has(user.uid) ? 'Saving...' : 'Save'}</button>
                                                            <button onClick={handleCancel} className="text-gray-600 hover:text-gray-900">Cancel</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                                            <button onClick={() => openSetPasswordModal(user)} className="text-gray-600 hover:text-gray-900">Set Pass</button>
                                                            <button onClick={() => handlePasswordReset(user.email)} className="text-blue-600 hover:text-blue-900">Reset Pass</button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {updateError && <tr><td colSpan={5} className="text-center text-red-600 text-sm py-2">{updateError}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isSetPasswordModalOpen && userToSetPassword && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-[60] flex items-center justify-center p-4">
                    <div className="relative mx-auto p-5 border w-full max-w-sm shadow-lg rounded-md bg-white">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Set New Password</h3>
                        <p className="text-sm text-gray-600 mb-4">Set a new password for <span className="font-semibold">{userToSetPassword.name}</span>.</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">New Password</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" autoFocus />
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                            <button onClick={() => setIsSetPasswordModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                            <button onClick={handleConfirmSetPassword} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CompanyManagementModal;