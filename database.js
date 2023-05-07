import sqlite from "sqlite3";

export function createTable(db) {
  const createStudentTable = `CREATE TABLE Student (
        studentId INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        rollNo TEXT NOT NULL,
        department TEXT NOT NULL,
        batch TEXT NOT NULL,
        phoneNumber TEXT NOT NULL,
        currentYear TEXT NOT NULL,
        division TEXT NOT NULL,
        photoUrl TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`;

  const createTeacherTable = `CREATE TABLE Teacher (
        teacherId INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        department TEXT NOT NULL,
        phoneNumber TEXT NOT NULL,
        photoUrl TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`;

  const createAttendanceTable = `CREATE TABLE Attendance (
        attendanceId INTEGER PRIMARY KEY AUTOINCREMENT,
        classYear TEXT NOT NULL,
        classDept TEXT NOT NULL,
        classSubject TEXT NOT NULL,
        startTime INTEGER NOT NULL,
        students TEXT,
        duration INTEGER NOT NULL,
        isCompleted INTEGER DEFAULT 0,
        classDivision TEXT NOT NULL,
        teacherId INTEGER REFERENCES Teacher(teacherId),
        UNIQUE (attendanceId, classYear, classDept, classSubject, startTime, duration) ON CONFLICT REPLACE
    )`;

  // db.run(createStudentTable);
  // db.run(createTeacherTable);
  // db.run(createAttendanceTable);
}

export const db = new sqlite.Database("./data.db", sqlite.OPEN_READWRITE, (err) => {
  if (err) console.error(err);
  console.log("Connected to DB");
});
