import React, { useState, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Camera, Upload, Check, X } from 'lucide-react';
import Webcam from 'react-webcam';
import axios from 'axios';
import Header from '../components/Header';
import { useNavigate } from "react-router-dom";
import { Check as LucideCheck, ArrowLeft } from "lucide-react";


const EnrollPage: React.FC = () => {
    const navigate = useNavigate();
  const { semester, section } = useUser();
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImages([...capturedImages, imageSrc]);
        
        // Convert base64 to file
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setPhotos([...photos, file]);
          });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos([...photos, ...newFiles]);
      
      // Create preview URLs for the uploaded files
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
    
    const newCapturedImages = [...capturedImages];
    newCapturedImages.splice(index, 1);
    setCapturedImages(newCapturedImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (photos.length === 0) {
      setMessage({ text: 'Please add at least one photo', type: 'error' });
      return;
    }
    
    setLoading(true);
    setMessage({ text: '', type: '' });
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('usn', usn);
    formData.append('semester', semester || '');
    formData.append('section', section || '');
    
    photos.forEach(photo => {
      formData.append('photos', photo);
    });
    
    try {
      const response = await axios.post('http://localhost:8000/api/enroll/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setMessage({ text: response.data.message, type: 'success' });
        // Reset form
        setName('');
        setUsn('');
        setPhotos([]);
        setCapturedImages([]);
        setShowCamera(false);
      } else {
        setMessage({ text: response.data.message || 'Enrollment failed', type: 'error' });
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setMessage({ text: 'An error occurred during enrollment', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-blue-800 mb-6">Enroll Student</h2>
            
            {message.text && (
              <div className={`mb-4 p-3 rounded ${
                message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {message.text}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter student's full name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="usn" className="block text-gray-700 font-medium mb-2">
                    USN (University Seat Number)
                  </label>
                  <input
                    type="text"
                    id="usn"
                    value={usn}
                    onChange={(e) => setUsn(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter student's USN"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Student Photos (for Face Recognition)
                </label>
                
                <div className="flex flex-wrap gap-4 mb-4">
                  {capturedImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={img} 
                        alt={`Student ${index + 1}`} 
                        className="w-24 h-24 object-cover rounded border border-gray-300" 
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCamera(!showCamera)}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    <Camera size={18} className="mr-2" />
                    {showCamera ? 'Hide Camera' : 'Use Camera'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    <Upload size={18} className="mr-2" />
                    Upload Photos
                  </button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                </div>
                
                {showCamera && (
                  <div className="mt-4">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full max-w-md rounded border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="mt-2 flex items-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                      <Camera size={18} className="mr-2" />
                      Capture Photo
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
              <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded transition-colors mr-3"
                >
                  <ArrowLeft size={18} className="mr-2" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className={`flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded transition-colors ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Check size={18} className="mr-2" />
                      Enroll Student
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EnrollPage;