import React, { useState, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Camera, Upload, Check, Users, X } from 'lucide-react';
import Webcam from 'react-webcam';
import axios from 'axios';
import Header from '../components/Header';
import { Check as LucideCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TakeAttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const { semester, section, subject } = useUser();
  const [photos, setPhotos] = useState<File[]>([]);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    present?: string[];
    absent?: string[];
    sheetUrl?: string;
  } | null>(null);

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
      setResult({
        success: false,
        message: 'Please add at least one photo of the class'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('semester', semester || '');
    formData.append('section', section || '');
    formData.append('subject', subject || '');

    photos.forEach(photo => {
      formData.append('class_images', photo);
    });

    try {
      const response = await axios.post('http://localhost:8000/api/take-attendance/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult({
        success: true,
        message: response.data.message,
        present: response.data.present_students,
        absent: response.data.absent_students,
        sheetUrl: response.data.sheet_url
      });

      // Reset photos after successful submission
      setPhotos([]);
      setCapturedImages([]);
      setShowCamera(false);
    } catch (err) {
      console.error('Attendance error:', err);
      setResult({
        success: false,
        message: 'An error occurred while taking attendance'
      });
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
            <h2 className="text-2xl font-bold text-blue-800 mb-2">Take Attendance</h2>
            <p className="text-gray-600 mb-6">
              Semester {semester} | Section {section} | Subject: {subject}
            </p>

            {result && (
              <div className={`mb-6 p-4 rounded ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>

                {result.success && result.present && result.absent && (
                  <div className="mt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-gray-800 flex items-center mb-2">
                          <Users size={18} className="mr-2 text-green-600" />
                          Present Students ({result.present.length})
                        </h3>
                        <div className="bg-white p-3 rounded border border-gray-200 max-h-60 overflow-y-auto">
                          {result.present.length > 0 ? (
                            <ul className="list-disc list-inside">
                              {result.present.map((student, index) => (
                                <li key={index} className="text-sm text-gray-700">{student}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500">No students present</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium text-gray-800 flex items-center mb-2">
                          <Users size={18} className="mr-2 text-red-600" />
                          Absent Students ({result.absent.length})
                        </h3>
                        <div className="bg-white p-3 rounded border border-gray-200 max-h-60 overflow-y-auto">
                          {result.absent.length > 0 ? (
                            <ul className="list-disc list-inside">
                              {result.absent.map((student, index) => (
                                <li key={index} className="text-sm text-gray-700">{student}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500">No students absent</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {result.sheetUrl && (
                      <div className="mt-4">
                        <a
                          href={result.sheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          View Attendance Sheet
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Class Photos (for Attendance)
                </label>

                <div className="flex flex-wrap gap-4 mb-4">
                  {capturedImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img}
                        alt={`Class ${index + 1}`}
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
                      Take Attendance
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

export default TakeAttendancePage;
