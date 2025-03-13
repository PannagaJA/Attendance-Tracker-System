import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { UserPlus, UserCheck, BarChart } from 'lucide-react';
import Header from '../components/Header';

const OptionsPage: React.FC = () => {
  const { semester, section, subject } = useUser();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold text-blue-800 mb-4">Class Information</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Semester</p>
                <p className="text-xl font-semibold">{semester}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Section</p>
                <p className="text-xl font-semibold">{section}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Subject</p>
                <p className="text-xl font-semibold">{subject}</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-blue-800 mb-6">What would you like to do?</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Link to="/enroll" className="block">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center h-full flex flex-col">
                <div className="flex justify-center mb-4">
                  <UserPlus size={48} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Enroll Students</h3>
                <p className="text-gray-600 flex-grow">
                  Add new students to the system with facial recognition
                </p>
                <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors w-full">
                  Enroll
                </button>
              </div>
            </Link>
            
            <Link to="/take-attendance" className="block">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center h-full flex flex-col">
                <div className="flex justify-center mb-4">
                  <UserCheck size={48} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Take Attendance</h3>
                <p className="text-gray-600 flex-grow">
                  Capture attendance using facial recognition
                </p>
                <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors w-full">
                  Take Attendance
                </button>
              </div>
            </Link>
            
            <Link to="/attendance-statistics" className="block">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center h-full flex flex-col">
                <div className="flex justify-center mb-4">
                  <BarChart size={48} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">View Statistics</h3>
                <p className="text-gray-600 flex-grow">
                  Generate and view attendance reports and statistics
                </p>
                <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors w-full">
                  View Statistics
                </button>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OptionsPage;