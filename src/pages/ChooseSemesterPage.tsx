import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { BookOpen, Users, BookMarked } from 'lucide-react';
import Header from '../components/Header';

const ChooseSemesterPage: React.FC = () => {
  const { setSemester, setSection, setSubject } = useUser();
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const semesters = Array.from({ length: 8 }, (_, i) => (i + 1).toString());
  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSubject.trim()) {
      setError('Please enter a subject name');
      return;
    }
    
    setSemester(selectedSemester);
    setSection(selectedSection);
    setSubject(selectedSubject);
    navigate('/options');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-center text-blue-800 mb-6">Choose Class Details</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="semester" className="block text-gray-700 font-medium mb-2 flex items-center">
                <BookOpen size={18} className="mr-2" />
                Semester
              </label>
              <select
                id="semester"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="section" className="block text-gray-700 font-medium mb-2 flex items-center">
                <Users size={18} className="mr-2" />
                Section
              </label>
              <select
                id="section"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {sections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-6">
              <label htmlFor="subject" className="block text-gray-700 font-medium mb-2 flex items-center">
                <BookMarked size={18} className="mr-2" />
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter subject name"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ChooseSemesterPage;