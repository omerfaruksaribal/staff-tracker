import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Header from './components/Header';
import PageNotFound from './pages/PageNotFound';
import Profile from './pages/Profile';
import PrivateRoute from './components/PrivateRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthProvider'; // Import the AuthProvider

function App() {
    return (
        <>
            <Router>
                <AuthProvider>
                    <Header />
                    <Routes>
                        <Route path='/' element={<Home />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/profile" element={<PrivateRoute element={Profile} />} />
                        <Route path="/profile/:id" element={<PrivateRoute element={Profile} />} />
                        <Route path='*' element={<PageNotFound />} />
                        <Route path='404' element={<PageNotFound />} />
                    </Routes>
                </AuthProvider>
            </Router>
            <ToastContainer />
        </>
    );
}

export default App;
