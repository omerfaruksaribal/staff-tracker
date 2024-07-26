import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase.config';
import { getDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';

function Profile() {
    const auth = getAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        about: '',
        languages: '',
        image: '', // URL of the image in Firebase Storage
    });
    const [isEditing, setIsEditing] = useState(false);
    const { name, email, about, languages, image } = formData;

    useEffect(() => {
        if (auth.currentUser) {
            setFormData({
                name: auth.currentUser.displayName,
                email: auth.currentUser.email,
                about: '',
                languages: '',
                image: '',
            });

            const fetchUserData = async () => {
                try {
                    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                    if (userDoc.exists()) {
                        setFormData((prevState) => ({
                            ...prevState,
                            about: userDoc.data().about,
                            languages: userDoc.data().languages,
                            image: userDoc.data().image || '',
                        }));
                    }
                } catch (error) {
                    toast.error('Failed to fetch user data');
                }
            };
            fetchUserData();
        }
    }, [auth.currentUser]);

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.id]: e.target.value,
        }));
    };

    const onFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Upload image to Firebase Storage
            const uploadImage = async (file) => {
                try {
                    const storage = getStorage();
                    const fileName = `${auth.currentUser.uid}-${file.name}-${uuidv4()}`;
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
                                switch (snapshot.state) {
                                    case 'paused':
                                        console.log('Upload is paused');
                                        break;
                                    case 'running':
                                        console.log('Upload is running');
                                        break;
                                    default:
                                        break;
                                }
                            },
                            (error) => reject(error),
                            () => {
                                // Handle successful uploads
                                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
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

            uploadImage(file).then((downloadURL) => {
                setFormData((prevState) => ({
                    ...prevState,
                    image: downloadURL, // Save URL to state
                }));
            });
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        try {
            const formDataCopy = {
                about,
                languages,
                image, // Save URL to Firestore
                timestamp: serverTimestamp(),
            };

            // Update Firestore document
            await updateDoc(doc(db, 'users', auth.currentUser.uid), formDataCopy);

            toast.success('Profile updated successfully');
            setIsEditing(false); // Close the form after updating
        } catch (error) {
            toast.error('Failed to update profile');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="bg-white max-w-2xl shadow overflow-hidden sm:rounded-lg mx-4">
                <div className="px-4 py-5 sm:px-6">
                    {image && (
                        <div className="text-center mb-4">
                            <img
                                src={image}
                                alt="Profile"
                                className="w-32 h-32 rounded-full object-cover mx-auto"
                            />
                        </div>
                    )}
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        User database
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Details and information about the user.
                    </p>
                </div>
                <div className="border-t border-gray-200">
                    <dl>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">
                                Full name
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {name}
                            </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">
                                Languages
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {languages}
                            </dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">
                                Email address
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {email}
                            </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">
                                About
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {about}
                            </dd>
                        </div>
                    </dl>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {isEditing ? 'Update Profile' : 'Edit Profile'}
                    </h3>
                    {isEditing ? (
                        <form onSubmit={onSubmit}>
                            <div>
                                <label htmlFor="about" className="block text-sm font-medium leading-6 text-gray-900">
                                    About
                                </label>
                                <textarea
                                    id="about"
                                    value={about}
                                    onChange={onChange}
                                    className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 pl-4 text-left focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                            <div className="mt-4">
                                <label htmlFor="languages" className="block text-sm font-medium leading-6 text-gray-900">
                                    Languages
                                </label>
                                <textarea
                                    id="languages"
                                    value={languages}
                                    onChange={onChange}
                                    className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 pl-4 text-left focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                            <div className="mt-4">
                                <label htmlFor="image" className="block text-sm font-medium leading-6 text-gray-900">
                                    Profile Image
                                </label>
                                <input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={onFileChange}
                                    className="mt-2 block w-full text-sm text-gray-900"
                                />
                            </div>
                            <button
                                type="submit"
                                className="mt-4 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="mt-4 ml-2 inline-flex justify-center rounded-md border border-transparent bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            >
                                Cancel
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="mt-4 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;
