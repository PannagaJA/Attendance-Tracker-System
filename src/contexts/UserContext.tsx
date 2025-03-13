import React, { createContext, useState, useContext, ReactNode } from 'react';

interface UserContextType {
  user: string | null;
  semester: string | null;
  section: string | null;
  subject: string | null;
  setUser: (user: string | null) => void;
  setSemester: (semester: string | null) => void;
  setSection: (section: string | null) => void;
  setSubject: (subject: string | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
  const [semester, setSemester] = useState<string | null>(localStorage.getItem('semester'));
  const [section, setSection] = useState<string | null>(localStorage.getItem('section'));
  const [subject, setSubject] = useState<string | null>(localStorage.getItem('subject'));

  const handleSetUser = (newUser: string | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('user', newUser);
    } else {
      localStorage.removeItem('user');
    }
  };

  const handleSetSemester = (newSemester: string | null) => {
    setSemester(newSemester);
    if (newSemester) {
      localStorage.setItem('semester', newSemester);
    } else {
      localStorage.removeItem('semester');
    }
  };

  const handleSetSection = (newSection: string | null) => {
    setSection(newSection);
    if (newSection) {
      localStorage.setItem('section', newSection);
    } else {
      localStorage.removeItem('section');
    }
  };

  const handleSetSubject = (newSubject: string | null) => {
    setSubject(newSubject);
    if (newSubject) {
      localStorage.setItem('subject', newSubject);
    } else {
      localStorage.removeItem('subject');
    }
  };

  const logout = () => {
    setUser(null);
    setSemester(null);
    setSection(null);
    setSubject(null);
    localStorage.removeItem('user');
    localStorage.removeItem('semester');
    localStorage.removeItem('section');
    localStorage.removeItem('subject');
  };

  return (
    <UserContext.Provider
      value={{
        user,
        semester,
        section,
        subject,
        setUser: handleSetUser,
        setSemester: handleSetSemester,
        setSection: handleSetSection,
        setSubject: handleSetSubject,
        logout
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};