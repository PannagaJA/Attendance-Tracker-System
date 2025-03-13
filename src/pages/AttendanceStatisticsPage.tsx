import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { FileText, Download, BarChart } from 'lucide-react';
import axios from 'axios';
import Header from '../components/Header';
import { useNavigate } from "react-router-dom";
import { Check as LucideCheck, ArrowLeft } from "lucide-react";

interface AttendanceFile {
  id: string;
  name: string;
}

interface AttendanceStatistics {
  above75: Array<{ student: string; percentage: number }>;
  below75: Array<{ student: string; percentage: number }>;
}

const AttendanceStatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { semester, section, subject } = useUser();
  const [files, setFiles] = useState<AttendanceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [statistics, setStatistics] = useState<AttendanceStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    // Fetch available attendance files
    const fetchFiles = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/attendance-files/', {
          params: { semester, section, subject }
        });
        
        if (response.data.success) {
          setFiles(response.data.files);
        } else {
          setError('Failed to load attendance files');
        }
      } catch (err) {
        console.error('Error fetching attendance files:', err);
        setError('An error occurred while fetching attendance files');
      }
    };
    
    fetchFiles();
  }, [semester, section, subject]);

  const generateStatistics = async () => {
    if (!selectedFile) {
      setError('Please select an attendance file');
      return;
    }
    
    setLoading(true);
    setError('');
    setStatistics(null);
    setPdfUrl('');
    
    try {
      const response = await axios.post('http://localhost:8000/api/generate-statistics/', {
        file_id: selectedFile
      });
      
      if (response.data.success) {
        setStatistics({
          above75: response.data.above_75,
          below75: response.data.below_75
        });
        setPdfUrl(response.data.pdf_url);
      } else {
        setError(response.data.message || 'Failed to generate statistics');
      }
    } catch (err) {
      console.error('Error generating statistics:', err);
      setError('An error occurred while generating statistics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-blue-800 mb-2">Attendance Statistics</h1>
            <div className='flex justify-end'>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center mt-0 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              <ArrowLeft size={18} className="mr-1" />
              Back
            </button>
            </div>
            <p className="text-gray-600 mb-6">
              Semester {semester} | Section {section} | Subject: {subject}
            </p>
            
            {error && (
              <div className="mb-6 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <div className="mb-6">
              <label htmlFor="file" className="block text-gray-700 font-medium mb-2 flex items-center">
                <FileText size={18} className="mr-2" />
                Select Attendance File
              </label>
              
              {files.length > 0 ? (
                <div className="flex items-center gap-4">
                  <select
                    id="file"
                    value={selectedFile}
                    onChange={(e) => setSelectedFile(e.target.value)}
                    className="flex-grow p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a file --</option>
                    {files.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={generateStatistics}
                    disabled={!selectedFile || loading}
                    className={`flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded transition-colors ${
                      !selectedFile || loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    <BarChart size={18} className="mr-2" />
                    {loading ? 'Generating...' : 'Generate Statistics'}
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">No attendance files available</p>
              )}
            </div>
            
            {statistics && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">Attendance Results</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-3">Students with ≥75% Attendance</h4>
                    {statistics.above75.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-green-100">
                              <th className="text-left p-2">Student</th>
                              <th className="text-right p-2">Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {statistics.above75.map((item, index) => (
                              <tr key={index} className="border-b border-green-100">
                                <td className="p-2">{item.student}</td>
                                <td className="text-right p-2 font-medium">{item.percentage.toFixed(2)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-600">No students with attendance ≥75%</p>
                    )}
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-800 mb-3">Students with &lt;75% Attendance</h4>
                    {statistics.below75.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-red-100">
                              <th className="text-left p-2">Student</th>
                              <th className="text-right p-2">Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {statistics.below75.map((item, index) => (
                              <tr key={index} className="border-b border-red-100">
                                <td className="p-2">{item.student}</td>
                                <td className="text-right p-2 font-medium">{item.percentage.toFixed(2)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-600">No students with attendance &lt;75%</p>
                    )}
                  </div>
                </div>
                
                {pdfUrl && (
                  <div className="mt-6 flex justify-center">
                    <a
                      href={pdfUrl}
                      download
                      className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                      <Download size={18} className="mr-2" />
                      Download PDF Report
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AttendanceStatisticsPage;