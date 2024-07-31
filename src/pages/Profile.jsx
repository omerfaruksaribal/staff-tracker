import React, { useState, useEffect } from 'react';
import { db } from '../firebase.config';
import { getAuth } from 'firebase/auth';
import { getDoc, doc, updateDoc, serverTimestamp, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateFormatter'
import Resizer from 'react-image-file-resizer';
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css';

// API URL
const API_URL = 'https://api.zumbo.net/resmitatiller/';

function Profile() {
    const auth = getAuth();
    const navigate = useNavigate()
    const { id } = useParams()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        about: '',
        languages: '',
        image: '',
        startedAt: '',
        numberOfPerm: 0,
        isAdmin: false,
    });
    const [previousStartedAt, setPreviousStartedAt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isTakingPermission, setIsTakingPermission] = useState(false);
    const [permStartAt, setPermStartAt] = useState('');
    const [permEndAt, setPermEndAt] = useState('');
    const [permMessage, setPermMessage] = useState('')
    const [permissionRequests, setPermissionRequests] = useState([]);
    const [disabledDates, setDisabledDates] = useState([])
    const { name, email, about, languages, image, startedAt, numberOfPerm, isAdmin } = formData;

    const fetchPermissionRequests = async () => {
        try {
            const q = query(collection(db, 'permissions'), where('status', '==', 'pending'));
            const querySnapshot = await getDocs(q);
            const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
            // Fetch user names for each request
            const users = await Promise.all(requests.map(async (request) => {
                const userDoc = await getDoc(doc(db, 'users', request.userID));
                return { ...request, userName: userDoc.data().name }; // Add userName to each request
            }));
    
            setPermissionRequests(users);
        } catch (error) {
            toast.error('Failed to fetch permission requests');
            console.error('Error fetching permission requests:', error);
        }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', id));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setFormData({
                        name: data.name,
                        email: data.email,
                        about: data.about || '',
                        languages: data.languages || '',
                        image: data.image || '',
                        startedAt: data.startedAt ? data.startedAt.toDate().toISOString().substring(0, 10) : '',
                        numberOfPerm: data.numberOfPerm || 0,
                        isAdmin: data.isAdmin || false,
                    });
                    setPreviousStartedAt(data.startedAt ? data.startedAt.toDate().toISOString().substring(0, 10) : '');
                } else {
                    navigate('/404')
                }
            } catch (error) {
                toast.error('Failed to fetch user data');
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [id, navigate]);


    useEffect(() => {
        if (isAdmin) {
            fetchPermissionRequests(); // Ensure this function is defined as above
        }
    }, [isAdmin]);    

    useEffect(() => {
        const fetchPermissionRequests = async () => {
            try {
                const q = query(collection(db, 'permissions'), where('status', '==', 'pending'));
                const querySnapshot = await getDocs(q);
                const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
                // Fetch user names for each request
                const users = await Promise.all(requests.map(async (request) => {
                    const userDoc = await getDoc(doc(db, 'users', request.userID));
                    return { ...request, userName: userDoc.data().name }; // Add userName to each request
                }));
    
                setPermissionRequests(users);
            } catch (error) {
                console.error('Failed to fetch permission requests', error);
            }
        };
        const fetchHolidayData = async () => {
            try {
                const response = await fetch(API_URL);
                const data = await response.json();

                // API'den gelen tatil verilerini işleyip tarihe dönüştürüyoruz
                const dates = data.resmitatiller.map(holiday => new Date(holiday.tarih));
                setDisabledDates(dates);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchHolidayData();
        fetchPermissionRequests();
    }, []); // Add dependencies if needed

    const isWeekend = (date) => {
        const day = date.getDay()
        return day === 0 || day === 6; // 0 sunday, 6 saturday
    }

    const tileDisabled = ({ date }) => {
        return isWeekend(date) || disabledDates.some(disabledDate => 
            date.getFullYear() === disabledDate.getFullYear() &&
            date.getMonth() === disabledDate.getMonth() &&
            date.getDate() === disabledDate.getDate() // Note the correction here
        );
    };


    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.id]: e.target.value,
        }));
    };
    
    const onCalendarChange = (date) => {
        // Adjust date to local time zone
        const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setFormData((prevState) => ({
            ...prevState,
            startedAt: adjustedDate.toISOString().substring(0, 10),
        }));
    };

    const onPermStartCalendarChange = (date) => {
        const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setPermStartAt(adjustedDate.toISOString().substring(0, 10));
    };

    const onPermEndCalendarChange = (date) => {
        const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        setPermEndAt(adjustedDate.toISOString().substring(0, 10))
    };


    const onFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Resize image before uploading to Firebase Storage
            Resizer.imageFileResizer(
                file,
                800, // Max width
                800, // Max height
                'JPEG', // Output format
                90, // Quality
                0, // Rotation
                (uri) => {
                    // Upload resized image to Firebase Storage
                    uploadImage(uri);
                },
                'file' // Output type
            );
        }
    };

    const uploadImage = async (file) => {
        try {
            const storage = getStorage();
            const fileName = `${auth.currentUser.uid}-${uuidv4()}`;
            const storageRef = ref(storage, 'images/' + fileName);
            const metadata = { contentType: file.type };

            const uploadTask = uploadBytesResumable(storageRef, file, metadata);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        // Handle progress
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('Upload is ' + progress + '% done');
                    },
                    (error) => reject(error),
                    () => {
                        // Handle successful uploads
                        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                            setFormData((prevState) => ({
                                ...prevState,
                                image: downloadURL, // Save URL to state
                            }));
                            resolve(downloadURL);
                        });
                    }
                );
            });
        } catch (error) {
            toast.error('Image could not be uploaded');
            throw error;
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        const newStartedAt = startedAt ? new Date(startedAt) : null;
        let newNumberOfPerm = numberOfPerm;

        // Only recalculate numberOfPerm if startedAt is set for the first time
        if (newStartedAt && !previousStartedAt) {
            const { years } = calculateDateDifference(newStartedAt);

            if (years < 1) {
                newNumberOfPerm = 0;
            } else if (years >= 1 && years < 3) {
                newNumberOfPerm = 7;
            } else if (years >= 3 && years < 5) {
                newNumberOfPerm = 14;
            } else {
                newNumberOfPerm = 30;
            }
        }

        try {
            const formDataCopy = {
                about,
                languages,
                image,
                timestamp: serverTimestamp(),
                startedAt: newStartedAt ? newStartedAt : null,
                numberOfPerm: newNumberOfPerm
            };

            await updateDoc(doc(db, 'users', auth.currentUser.uid), formDataCopy);
            setFormData((prevState) => ({
                ...prevState,
                ...formDataCopy
            }));
            setPreviousStartedAt(newStartedAt ? newStartedAt.toISOString().substring(0, 10) : '');

            toast.success('Profile updated successfully');
            setIsEditing(false);
        } catch (error) {
            toast.error('Failed to update profile');
        }
    };

    const calculateDateDifference = (startedAt) => {
        const today = new Date();
        const start = new Date(startedAt);

        let years = today.getFullYear() - start.getFullYear();
        let months = today.getMonth() - start.getMonth();
        let days = today.getDate() - start.getDate();

        if (days < 0) {
            months--;
            const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, start.getDate());
            days += new Date(today.getFullYear(), today.getMonth(), 0).getDate() - prevMonth.getDate() + today.getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        return { years, months, days };
    };
    
    const takePermission = async (e) => {
        e.preventDefault();

        if (numberOfPerm <= 0) {
            toast.error('You do not have any permission to take');
            return setIsTakingPermission(false);
        }
        // Calculate permission days
        const start = new Date(permStartAt);
        const end = new Date(permEndAt);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Difference in days

        if (diffDays > numberOfPerm) {
            toast.error('Permission days exceed available days');
            return setIsTakingPermission(false);
        }
        try {
            await addDoc(collection(db, 'permissions'), {
                userID: id,
                permStartAt: new Date(permStartAt),
                permEndAt: new Date(permEndAt),
                permMessage,
                status: 'pending',
                timestamp: serverTimestamp(),
            });
            toast.success('Permission requested successfully');
            // Refetch permission requests after adding a new one
            fetchPermissionRequests(); // Ensure this function is defined and refetches the data

            setPermMessage('')
            setIsTakingPermission(false)
        } catch (error) {
            toast.error('Failed to request permission');
            setIsTakingPermission(false);
        }
    };

    const handlePermissionRequest = async (requestId, isApproved) => {
        const status = isApproved ? 'approved' : 'rejected';
    
        try {
            await updateDoc(doc(db, 'permissions', requestId), { status });
    
            if (isApproved) {
                // If approved, update user permissions
                const requestDoc = await getDoc(doc(db, 'permissions', requestId));
                const { permStartAt, permEndAt } = requestDoc.data();
                const daysRequested = Math.ceil(Math.abs(permEndAt.toDate() - permStartAt.toDate()) / (1000 * 60 * 60 * 24));
    
                // Find the user and update their permissions
                const userDoc = await getDoc(doc(db, 'users', requestDoc.data().userID));
                const currentPerm = userDoc.data().numberOfPerm;
    
                // Ensure you only deduct the number of permissions when the request is approved
                if (query(collection(db, 'permissions'), where('status', '==', 'approved'))) {
                    await updateDoc(doc(db, 'users', requestDoc.data().userID), { numberOfPerm: currentPerm - daysRequested });
                }
            }
            // Refetch permission requests after updating the status
            const q = query(collection(db, 'permissions'), where('status', '==', 'pending'));
            const querySnapshot = await getDocs(q);
            const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fetch user names for each request
            const users = await Promise.all(requests.map(async (request) => {
                const userDoc = await getDoc(doc(db, 'users', request.userID));
                return { ...request, userName: userDoc.data().name }; // Add userName to each request
            }));

            setPermissionRequests(users);
    
            toast.success(`Permission request ${status}`);
        } catch (error) {
            toast.error('Failed to handle permission request');
        }
    };    
    
    
    return (
        <div className="container mx-auto p-4">
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="flex flex-col mb-4">
                    {image && <img src={image} alt="Profile" className="w-32 h-32 mt-2 rounded-full" />}
                    <label htmlFor="name" className="mb-2">Name:</label>
                    <p className="p-2 border border-gray-300 rounded">{name}</p>
                </div>

                <div className="flex flex-col mb-4">
                    <label htmlFor="email" className="mb-2">Email:</label>
                    <p className="p-2 border border-gray-300 rounded">{email}</p>
                </div>

                <div className="flex flex-col mb-4">
                    <label htmlFor="about" className="mb-2">About:</label>
                    <textarea
                        id="about"
                        value={about}
                        onChange={onChange}
                        disabled={!isEditing}
                        className="p-2 border border-gray-300 rounded"
                    />
                </div>

                <div className="flex flex-col mb-4">
                    <label htmlFor="languages" className="mb-2">Languages:</label>
                    <input
                        type="text"
                        id="languages"
                        value={languages}
                        onChange={onChange}
                        disabled={!isEditing}
                        className="p-2 border border-gray-300 rounded"
                    />
                </div>
                {auth.currentUser.uid === id && (
                    <div className="flex flex-col mb-4">
                        <label htmlFor="image" className="mb-2">Profile Image:</label>
                        <input
                            type="file"
                            id="image"
                            onChange={onFileChange}
                            disabled={!isEditing}
                            className="p-2 border border-gray-300 rounded"
                        />
                    </div>
                )}

                <div className='flex flex-col mb-4'>
                    <label htmlFor="startedAt" className='mb-2'>Start Date of Employement:</label>
                    {isEditing ? (
                        <Calendar locale='tr-TR' onChange={onCalendarChange} value={startedAt ? new Date(startedAt) : new Date()} />
                    ) : (
                        <p className="p-2 border border-gray-300 rounded">{formatDate(new Date(startedAt))}</p>
                    )}
                </div>
                {isAdmin && (
                    <div className="flex flex-col mb-4">
                        <label htmlFor="numberOfPerm" className="mb-2">Available Permissions:</label>
                        <p className="p-2 border border-gray-300 rounded">{numberOfPerm}</p>
                    </div>
                )}
                {auth.currentUser.uid === id && (
                    <>
                        {isEditing && (
                            <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                                Save Changes
                            </button>
                        )}
        
                        {!isEditing && (
                            <button type="button" onClick={() => setIsEditing(true)} className="bg-green-500 text-white p-2 rounded">
                                Edit Profile
                            </button>
                        )}
                    </>
                )}
            </form>

            {isAdmin && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Permission Requests</h2>
                    {permissionRequests.length > 0 ? (
                        <ul>
                            {permissionRequests.map((request) => (
                                <li key={request.id} className="border p-4 mb-4 rounded">
                                    <p><strong>{request.userName}</strong> is requesting permission from {formatDate(request.permStartAt.toDate())} to {formatDate(request.permEndAt.toDate())}</p>
                                    <p><strong>Permission Message: </strong>{request.permMessage}</p>
                                    <p><strong>Status:</strong> {request.status}</p>
                                    <div className="flex space-x-4 mt-2">
                                        <button onClick={() => handlePermissionRequest(request.id, true)} className="bg-green-500 text-white p-2 rounded">Approve</button>
                                        <button onClick={() => handlePermissionRequest(request.id, false)} className="bg-red-500 text-white p-2 rounded">Reject</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No permission requests at the moment.</p>
                    )}
                </div>
            )}
            {auth.currentUser.uid === id && (
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Request Permission</h2>
                {isTakingPermission && (
                    <form onSubmit={takePermission} className="space-y-4">
                        <div className="flex flex-col mb-4">
                            <label htmlFor="permStartAt" className="mb-2">Start Date:</label>
                            <Calendar
                                tileDisabled={tileDisabled}
                                onChange={onPermStartCalendarChange}
                                value={permStartAt ? new Date(permStartAt) : new Date()}
                            />
                        </div>

                        <div className="flex flex-col mb-4">
                            <label htmlFor="permEndAt" className="mb-2">End Date:</label>
                            <Calendar
                                tileDisabled={tileDisabled}
                                onChange={onPermEndCalendarChange}
                                value={permEndAt ? new Date(permEndAt) : new Date()}
                            />
                        </div>

                        <div className="flex flex-col mb-4">
                            <label htmlFor="permMessage" className="mb-2">Permission Message:</label>
                            <input
                                type="text"
                                id="permMessage"
                                value={permMessage}
                                onChange={(e) => setPermMessage(e.target.value)}
                                className="p-2 border border-gray-300 rounded"
                            />
                        </div>

                        <button type="submit" className="bg-blue-500 text-white p-2 rounded">Send Request</button>
                    </form>
                )}

                {!isTakingPermission && (
                    <button onClick={() => setIsTakingPermission(true)} className="bg-blue-500 text-white p-2 rounded">Request Permission</button>
                )}
            </div>
            )}
        </div>
    );
}

export default Profile;
