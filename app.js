import express from "express";
import url from "url";
import { createTable, db } from "./database.js";
import bodyParser from "body-parser";
import cors from "cors";
import { hashPassword, verifyFace, verifyPassword, myLogger, myLogger2 } from "./utils.js";
import { getDistance } from "geolib";
import Excel from "exceljs";
import download from "image-downloader";
const app = express();

// createTable(db);
const studentsAttendance = new Map();
const teachersLocation = new Map();

app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ limit: "5mb", extended: true }));
app.use(cors());

// student
app.post(
  "/api/registration/student",
  myLogger,
  (req, res) => {
    const { name, email, password, cpassword, rollNo, department, batch, phoneNumber, currentYear, division, photoUrl } = req.body;
    if (password != cpassword) {
      return res.status(400).json({
        message: "Passwords don't match",
      });
    }
    const hash = hashPassword(password);
    const insertStudent = `INSERT INTO Student(name, email, password, rollNo, department, batch, phoneNumber, currentYear, division, photoUrl, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
    const currentTime = new Date().getTime();
    db.run(insertStudent, [name, email, hash, rollNo, department, batch, phoneNumber, currentYear, division, photoUrl, currentTime], (err) => {
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
    });
  },
  myLogger2
);

app.post(
  "/api/login/student",
  myLogger,
  (req, res) => {
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
  },
  myLogger2
);

app.post(
  "/api/verifyFace",
  myLogger,
  (req, res) => {
    req.socket.setTimeout(60000);
    const { profileUrl, faceUrl } = req.body;

    download
      .image({
        url: faceUrl,
        dest: "/Users/ashishsah/Documents/project/smart-application-server/images/image1.jpeg",
      })
      .then(async () => {
        const listOfUrls = profileUrl
          .trim()
          .split(" ")
          .filter((url) => url !== undefined || url !== "" || url.length !== 0);
        for (let i = 0; i < listOfUrls.length; i++) {
          const url = listOfUrls[i];
          try {
            await download.image({
              url: url,
              dest: "/Users/ashishsah/Documents/project/smart-application-server/images/image2.jpeg",
            });
            try {
              const data = await verifyFace();
              if (data[0] == 49) {
                return res.status(200).json({
                  message: "Face Verified Successfully!",
                });
              }
            } catch (err) {
              console.log(err);
            }
          } catch (err) {
            console.log(err);
          }
          if (i == listOfUrls.length - 1) {
            return res.status(400).json({
              message: "Face Verification Failed!",
            });
          }
        }
      })
      .catch((err) => {
        console.log(err);
        return res.status(400).json({
          message: err,
        });
      });
  },
  myLogger2
);

app.post(
  "/api/verifyLocation",
  myLogger,
  (req, res) => {
    const { latitude, longitude, attendanceId } = req.body;
    const teacherLocation = teachersLocation.has(attendanceId);
    let distance = 0;
    if (!teacherLocation) {
      distance = getDistance(
        {
          latitude: latitude,
          longitude: longitude,
        },
        {
          latitude: latitude,
          longitude: longitude,
        }
      );
    } else {
      distance = getDistance(
        {
          latitude: latitude,
          longitude: longitude,
        },
        {
          latitude: teacherLocation.latitude,
          longitude: teacherLocation.longitude,
        }
      );
    }
    if (distance > 150) {
      return res.status(400).json({
        message: "Too far from class room",
      });
    } else {
      return res.status(200).json({
        message: "Location Verified!",
      });
    }
  },
  myLogger2
);

app.post(
  "/api/markAttendance",
  myLogger,
  (req, res) => {
    const { attendanceId, studentId } = req.body;
    console.log(studentsAttendance);
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
  },
  myLogger2
);

app.get(
  "/api/studentDetails",
  myLogger,
  (req, res) => {
    const studentId = url.parse(req.url, true).query.studentId;
    db.all(`SELECT * FROM Student WHERE studentId = ?`, [studentId], (err, rows) => {
      if (err) {
        return res.status(400).json({
          message: err,
        });
      }
      return res.status(200).json({
        data: rows[0],
      });
    });
  },
  myLogger2
);

app.get(
  "/api/getAttendance",
  myLogger,
  (req, res) => {
    const { classDept, currentYear, classDivision } = url.parse(req.url, true).query;
    db.all(`SELECT * FROM Attendance WHERE classDept = ? AND classYear = ? AND classDivision = ? AND isCompleted = ?`, [classDept, currentYear, classDivision, 0], (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(400).json({
          message: err,
        });
      }
      return res.status(200).json({
        data: rows,
      });
    });
  },
  myLogger2
);

app.get(
  "/api/attendanceCount",
  myLogger,
  (req, res) => {
    const { studentId, allData = false } = url.parse(req.url, true).query;
    db.all(`SELECT * FROM Student WHERE studentId = ?`, [studentId], (err, outerRows) => {
      if (err || outerRows.length === 0) {
        console.log(err);
        return res.status(400).json({
          message: err ? err.message : "Invalid Request",
        });
      }
      const student = outerRows[0];
      db.all(`SELECT * FROM Attendance WHERE classDept = ? AND classDivision = ? AND classYear = ?`, [student.department, student.division, student.currentYear], (err, innerRows) => {
        if (err) {
          console.log(err);
          return res.status(400).json({
            message: err.message,
          });
        }
        console.log(innerRows);
        const presentAttendance = innerRows?.filter((row) => row.students?.split(",")?.includes("" + studentId));
        if (allData) {
          return res.status(200).json({
            allAttendance: innerRows,
            presentAttendance: presentAttendance,
          });
        }
        return res.status(200).json({
          allAttendance: innerRows.length,
          presentAttendance: presentAttendance ? presentAttendance.length : 0,
        });
      });
    });
  },
  myLogger2
);

// teachers
app.post(
  "/api/registration/teacher",
  myLogger,
  (req, res) => {
    const { name, email, password, cpassword, department, phoneNumber, photoUrl } = req.body;
    if (password != cpassword) {
      return res.status(400).json({
        message: "Passwords don't match",
      });
    }
    const hash = hashPassword(password);
    const currentTime = new Date().getTime();
    const insertTeacher = `INSERT INTO Teacher(name, email, password, department, phoneNumber, photoUrl, createdAt) VALUES (?,?,?,?,?,?,?)`;
    db.run(insertTeacher, [name, email, hash, department, phoneNumber, photoUrl, currentTime], (err) => {
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
    });
  },
  myLogger2
);

app.post(
  "/api/login/teacher",
  myLogger,
  (req, res) => {
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
  },
  myLogger2
);

app.post(
  "/api/createAttendance",
  myLogger,
  (req, res) => {
    const { classYear, classDivision, classDept, classSubject, startTime, duration, teacherId, latitude = 18.4682959, longitude = 73.8364566 } = req.body;
    const createAttendance = `INSERT INTO Attendance (classYear, classDivision, classDept, classSubject, startTime, duration, teacherId, isCompleted) VALUES (?,?,?,?,?,?,?,?)`;
    db.run(createAttendance, [classYear, classDivision, classDept, classSubject, startTime, duration, teacherId, 0], (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(400).json({
          message: err,
        });
      }
      const getAttendanceId = `SELECT attendanceId FROM Attendance WHERE startTime = ? AND classYear = ? AND classDivision = ? AND classDept = ? AND classSubject = ?`;
      db.all(getAttendanceId, [startTime, classYear, classDivision, classDept, classSubject], (err, rows) => {
        if (err || rows.length < 1) {
          return res.status(400).json({
            message: err,
          });
        }
        const attendanceId = rows[0].attendanceId;
        studentsAttendance.set("" + attendanceId, new Array());
        teachersLocation.set(attendanceId, {
          latitude: latitude,
          longitude: longitude,
        });
        setTimeout(() => {
          const updateAttendance = `UPDATE Attendance SET students = ?, isCompleted = ? WHERE attendanceId = ?`;
          const students = studentsAttendance.get("" + attendanceId);
          db.all(updateAttendance, [students, 1, attendanceId], (err, rows) => {
            if (err) {
              console.log("Error occured while updating students list for attendanceId: " + attendanceId + " " + err);
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
      });
    });
  },
  myLogger2
);

app.get(
  "/api/downloadReport",
  myLogger,
  (req, res) => {
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
              res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
              res.setHeader("Content-Disposition", "attachment; filename=" + "Report.xlsx");
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
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=" + "Report.xlsx");
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
  },
  myLogger2
);

app.get(
  "/api/teacherDetails",
  myLogger,
  (req, res) => {
    const teacherId = url.parse(req.url, true).query.teacherId;
    db.all(`SELECT * FROM Teacher WHERE teacherId = ?`, [teacherId], (err, rows) => {
      if (err) {
        return res.status(400).json({
          message: err,
        });
      }
      return res.status(200).json({
        data: rows[0],
      });
    });
  },
  myLogger2
);

app.get(
  "/api/getAllAttendance",
  myLogger,
  (req, res) => {
    const teacherId = url.parse(req.url, true).query.teacherId;
    db.all(`SELECT * FROM Attendance WHERE teacherId = ?`, [teacherId], (err, rows) => {
      if (err) {
        return res.status(400).json({
          message: err,
        });
      }
      return res.status(200).json({
        data: rows,
      });
    });
  },
  myLogger2
);

app.get(
  "/api/allStudents",
  myLogger,
  (req, res) => {
    db.all(`SELECT * FROM Student`, (err, rows) => {
      if (err || rows.length === 0) {
        console.log(err);
        return res.status(400).json({
          message: err ? err.message : "Invalid Request",
        });
      }
      return res.status(200).json({
        data: rows,
      });
    });
  },
  myLogger2
);

app.get(
  "/api/subjectWise",
  myLogger,
  (req, res) => {
    const { classYear, classDept, classDivision, classSubject } = url.parse(req.url, true).query;
    db.all(`SELECT * FROM Attendance WHERE classYear = ? AND classDept = ? AND classDivision = ? AND classSubject = ?`, [classYear, classDept, classDivision, classSubject], (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(400).json({
          message: err.message,
        });
      }
      const data = new Map();
      rows.forEach((row) => {
        row.students?.split(",")?.forEach((studentId) => {
          if (studentId.trim().length > 0) {
            data.set(studentId, data.has(studentId) ? data.get(studentId) + 1 : 1);
          }
        });
      });

      const finalData = [];

      let index = 0;
      for (let [key, value] of data) {
        db.all(`SELECT * FROM Student WHERE studentId = ?`, [key], (err, rows) => {
          if (err) {
            console.log(err);
          } else {
            finalData.push({
              studentId: rows[0].studentId,
              name: rows[0].name,
              rollNo: rows[0].rollNo,
              batch: rows[0].batch,
              attendanceCount: value,
              totalCount: rows.length,
            });
            index++;
            if (index === data.size) {
              return res.status(200).json({
                data: finalData,
              });
            }
          }
        });
      }
      if (index >= data.size) {
        return res.status(400).json({
          message: "No data available",
        });
      }
    });
  },
  myLogger2
);

app.get(
  "/api/getAttendanceById",
  myLogger,
  (req, res) => {
    const { id } = url.parse(req.url, true).query;
    db.all(`SELECT * FROM Attendance WHERE attendanceId = ?`, [id], (err, rows) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      return res.status(200).json({
        data: rows[0],
      });
    });
  },
  myLogger2
);

app.get(
  "/",
  myLogger,
  (req, res) => {
    res.status(200).json({
      message: "Hello, world!",
    });
  },
  myLogger2
);

app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
});
