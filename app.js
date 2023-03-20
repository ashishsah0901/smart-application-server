import express from "express";
import url from "url";
import { db } from "./database.js";
import bodyParser from "body-parser";
import cors from "cors";
import {
  download,
  hashPassword,
  upload,
  verifyFace,
  verifyPassword,
} from "./utils.js";
import { getDistance } from "geolib";
import Excel from "exceljs";
const app = express();

// createTable(db);
const studentsAttendance = new Map();
const teachersLocation = new Map();

app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ limit: "5mb", extended: true }));
app.use(cors());

app.post("/api/registration/student", (req, res) => {
  const {
    name,
    email,
    password,
    cpassword,
    rollNo,
    department,
    batch,
    phoneNumber,
    currentYear,
    photoUrl,
  } = req.body;
  if (password != cpassword) {
    return res.status(400).json({
      message: "Passwords don't match",
    });
  }
  const hash = hashPassword(password);
  const insertStudent = `INSERT INTO Student(name, email, password, rollNo, department, batch, phoneNumber, currentYear, photoUrl, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)`;
  const currentTime = new Date().getTime();
  db.run(
    insertStudent,
    [
      name,
      email,
      hash,
      rollNo,
      department,
      batch,
      phoneNumber,
      currentYear,
      photoUrl,
      currentTime,
    ],
    (err) => {
      if (err) {
        return res.status(400).json({
          error: err,
        });
      }
      const getStudentData = `SELECT * FROM Student WHERE email = ?`;
      db.all(getStudentData, [email], (err, rows) => {
        if (err) {
          return res.status(400).json({
            error: err,
          });
        }
        return res.status(201).json({
          message: "User created successfully",
          id: rows[0].studentId,
        });
      });
    }
  );
});

app.post("/api/login/student", (req, res) => {
  const { email, password } = req.body;
  const getStudentData = `SELECT * FROM Student WHERE email = ?`;
  db.all(getStudentData, [email], (err, rows) => {
    if (err || rows.length < 1) {
      return res.status(400).json({
        message: "Invalid Credentials",
      });
    }
    const hash = rows[0].password;
    if (verifyPassword(password, hash)) {
      return res.status(200).json({
        message: "Login Successful!",
        id: rows[0].studentId,
      });
    } else {
      return res.status(400).json({
        message: "Invalid Credentials",
      });
    }
  });
});

app.post("/api/registration/teacher", (req, res) => {
  const {
    name,
    email,
    password,
    cpassword,
    department,
    phoneNumber,
    photoUrl,
  } = req.body;
  if (password != cpassword) {
    return res.status(400).json({
      message: "Passwords don't match",
    });
  }
  const hash = hashPassword(password);
  const currentTime = new Date().getTime();
  const insertTeacher = `INSERT INTO Teacher(name, email, password, department, phoneNumber, photoUrl, createdAt) VALUES (?,?,?,?,?,?,?)`;
  db.run(
    insertTeacher,
    [name, email, hash, department, phoneNumber, photoUrl, currentTime],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(400).json({
          error: err,
        });
      }
      const getTeacherData = `SELECT * FROM Teacher WHERE email = ?`;
      db.all(getTeacherData, [email], (err, rows) => {
        if (err) {
          return res.status(400).json({
            error: err,
          });
        }
        return res.status(201).json({
          message: "User created successfully",
          id: rows[0].teacherId,
        });
      });
    }
  );
});

app.post("/api/login/teacher", (req, res) => {
  const { email, password } = req.body;
  const getTeacherData = `SELECT * FROM Teacher WHERE email = ?`;
  db.all(getTeacherData, [email], (err, rows) => {
    if (err || rows.length < 1) {
      return res.status(400).json({
        message: "Invalid Credentials",
      });
    }
    const hash = rows[0].password;
    if (verifyPassword(password, hash)) {
      return res.status(200).json({
        message: "Login Successful!",
        id: rows[0].teacherId,
      });
    } else {
      return res.status(400).json({
        message: "Invalid Credentials",
      });
    }
  });
});

app.post("/api/verifyFace", upload, (req, res) => {
  const { id } = req.body;
  const getStudentProfileUrl = `SELECT photoUrl FROM Student WHERE studentId = ?`;

  const profileUrl = db.all(getStudentProfileUrl, [id], (err, rows) => {
    if (err || rows.length < 1) {
      return res.status(400).json({
        message: "Invalid Details",
      });
    }
    return rows[0].photoUrl;
  });

  profileUrl.split(",").forEach((url) => {
    download(url)
      .then(() => {
        verifyFace()
          .then((data) => {
            console.log(data);
            if (data[0] == 49) {
              return res.status(200).json({
                message: "Face Verified Successfully!",
              });
            }
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        console.log(err);
      });
  });
  return res.status(400).json({
    message: err,
  });
});

app.post("/api/createAttendance", (req, res) => {
  const {
    classYear,
    classDivision,
    classDept,
    classSubject,
    startTime,
    duration,
    teacherId,
    latitude = 18.4682959,
    longitude = 73.8364566,
  } = req.body;
  const createAttendance = `INSERT INTO Attendance (classYear, classDivision, classDept, classSubject, startTime, duration, teacherId) VALUES (?,?,?,?,?,?,?)`;
  db.run(
    createAttendance,
    [
      classYear,
      classDivision,
      classDept,
      classSubject,
      startTime,
      duration,
      teacherId,
    ],
    (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(400).json({
          message: err,
        });
      }
      const getAttendanceId = `SELECT attendanceId FROM Attendance WHERE startTime = ? AND classYear = ? AND classDivision = ? AND classDept = ? AND classSubject = ?`;
      db.all(
        getAttendanceId,
        [startTime, classYear, classDivision, classDept, classSubject],
        (err, rows) => {
          if (err || rows.length < 1) {
            return res.status(400).json({
              message: err,
            });
          }
          const attendanceId = rows[0].attendanceId;
          studentsAttendance.set(attendanceId, new Array());
          teachersLocation.set(attendanceId, {
            latitude: latitude,
            longitude: longitude,
          });
          setTimeout(() => {
            const updateAttendance = `UPDATE Attendance SET students = ? WHERE attendanceId = ?`;
            const students = studentsAttendance.get(attendanceId);
            db.all(updateAttendance, [students, attendanceId], (err, rows) => {
              if (err) {
                console.log(
                  "Error occured while updating students list for attendanceId: " +
                    attendanceId +
                    " " +
                    err
                );
              } else {
                studentsAttendance.delete(attendanceId);
                teachersLocation.delete(teachersLocation);
              }
            });
          }, 900000);
          return res.status(201).json({
            message: "Attendance Created Successfully!",
            id: attendanceId,
          });
        }
      );
    }
  );
});

app.post("/api/verifyLocation", (req, res) => {
  const { latitude, longitude, attendanceId } = req.body;
  const distance = getDistance(
    {
      latitude: latitude,
      longitude: longitude,
    },
    {
      latitude: teachersLocation[attendanceId].latitude,
      longitude: teachersLocation[attendanceId].longitude,
    }
  );
  if (distance > 150) {
    return res.status(400).json({
      message: "Too far from class room",
    });
  } else {
    return res.status(200).json({
      message: "Location Verified!",
    });
  }
});

app.post("/api/markAttendance", (req, res) => {
  const { attendanceId, studentId } = req.body;
  if (!studentsAttendance.has(attendanceId)) {
    return res.status(400).json({
      message: "Too late to mark Attendance!",
    });
  }
  const newAttendanceArray = studentsAttendance.get(attendanceId);
  newAttendanceArray.push(studentId);
  studentsAttendance.set(attendanceId, newAttendanceArray);
  return res.status(200).json({
    message: "Attendance marked successfully",
  });
});

app.get("/api/downloadReport", (req, res) => {
  const attendanceId = url.parse(req.url, true).query.attendanceId;
  const getStudents = `SELECT students FROM Attendance WHERE attendanceId = ?`;
  db.all(getStudents, [attendanceId], async (err, rows) => {
    if (err) {
      return res.status(400).json({
        message: err,
      });
    }
    try {
      var workbook = new Excel.Workbook();
      var worksheet = workbook.addWorksheet("My Sheet");

      worksheet.columns = [
        { header: "Student ID", key: "studentId", width: 10 },
        { header: "Name", key: "name", width: 32 },
        { header: "Email", key: "email", width: 32 },
        { header: "Roll Number", key: "rollNo", width: 16 },
        { header: "Department", key: "department", width: 32 },
        { header: "Batch", key: "batch", width: 10 },
        { header: "Phone Number", key: "phoneNumber", width: 32 },
        { header: "Current Year", key: "currentYear", width: 16 },
      ];
      const studentsId = rows[0].students.split(",");
      studentsId.forEach((id, index) => {
        const getStudentData = `SELECT * FROM Student WHERE studentId = ?`;
        db.all(getStudentData, [id], (err, rows) => {
          if (err) {
            return res.status(400).json({
              message: err,
            });
          }
          if (rows.length >= 1) {
            worksheet.addRow({
              studentId: rows[0].studentId,
              name: rows[0].name,
              email: rows[0].email,
              rollNo: rows[0].rollNo,
              department: rows[0].department,
              batch: rows[0].batch,
              phoneNumber: rows[0].phoneNumber,
              currentYear: rows[0].currentYear,
            });
          }
          if (index == studentsId.length - 1) {
            res.setHeader(
              "Content-Type",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            res.setHeader(
              "Content-Disposition",
              "attachment; filename=" + "Report.xlsx"
            );
            workbook.xlsx
              .write(res)
              .then(function (data) {
                res.end();
              })
              .catch((err) => {
                return res.status(400).json({
                  message: err,
                });
              });
          }
        });
      });
    } catch (err) {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "Report.xlsx"
      );
      workbook.xlsx
        .write(res)
        .then(function (data) {
          res.end();
        })
        .catch((err) => {
          return res.status(400).json({
            message: err,
          });
        });
    }
  });
});

app.get("/api/getAllAttendance", (req, res) => {
  const teacherId = url.parse(req.url, true).query.teacherId;
  db.all(
    `SELECT * FROM Attendance WHERE teacherId = ?`,
    [teacherId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({
          message: err,
        });
      }
      return res.status(200).json({
        data: rows,
      });
    }
  );
});

app.get("/api/studentDetails", (req, res) => {
  const studentId = url.parse(req.url, true).query.studentId;
  db.all(
    `SELECT * FROM Student WHERE studentId = ?`,
    [studentId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({
          message: err,
        });
      }
      return res.status(200).json({
        data: rows[0],
      });
    }
  );
});

app.get("/api/teacherDetails", (req, res) => {
  const teacherId = url.parse(req.url, true).query.teacherId;
  db.all(
    `SELECT * FROM Teacher WHERE teacherId = ?`,
    [teacherId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({
          message: err,
        });
      }
      return res.status(200).json({
        data: rows[0],
      });
    }
  );
});

app.get("/api/attendanceDetails", (req, res) => {
  const attendanceId = url.parse(req.url, true).query.attendanceId;
  db.all(
    `SELECT * FROM Attendance WHERE attendanceId = ?`,
    [attendanceId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({
          message: err,
        });
      }
      return res.status(200).json({
        data: rows[0],
      });
    }
  );
});

app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
});
