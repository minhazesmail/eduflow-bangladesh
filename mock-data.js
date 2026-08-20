/**
 * EduFlow demo dataset.
 * Read-only browser data only — never sent to Supabase.
 */
(function () {
  'use strict';

  const organizationId = 'demo-org-eduflow-bd';
  const now = '2026-08-21T09:00:00+06:00';

  const batches = [
    { id: 'batch-001', organization_id: organizationId, name: 'HSC 2027 • Science A', code: 'H27-SA', class_level: 'HSC 1st Year', section: 'A', subject: 'Physics + Chemistry', schedule: 'Sun, Tue, Thu • 4:00 PM', room: 'Room 204', teacher_id: 'teacher-001', status: 'active' },
    { id: 'batch-002', organization_id: organizationId, name: 'SSC 2027 • Science A', code: 'S27-SA', class_level: 'Class 10', section: 'A', subject: 'General Science', schedule: 'Sat, Mon, Wed • 5:30 PM', room: 'Room 102', teacher_id: 'teacher-002', status: 'active' },
    { id: 'batch-003', organization_id: organizationId, name: 'SSC 2027 • Commerce', code: 'S27-C', class_level: 'Class 10', section: 'C', subject: 'Accounting + Finance', schedule: 'Sun, Tue, Thu • 6:30 PM', room: 'Room 301', teacher_id: 'teacher-003', status: 'active' },
    { id: 'batch-004', organization_id: organizationId, name: 'Admission 2027 • Engineering', code: 'AD27-E', class_level: 'Admission', section: 'E', subject: 'Higher Math + Physics', schedule: 'Fri, Sat • 9:00 AM', room: 'Hall 1', teacher_id: 'teacher-004', status: 'active' },
    { id: 'batch-005', organization_id: organizationId, name: 'Class 8 • Foundation', code: 'C8-F', class_level: 'Class 8', section: 'F', subject: 'Math + English', schedule: 'Fri, Sun, Tue • 3:00 PM', room: 'Room 105', teacher_id: 'teacher-005', status: 'active' }
  ];

  const students = [
    { id: 'student-001', organization_id: organizationId, name: 'Rahim Ahmed', phone: '01711-428631', guardian_name: 'Md. Kamal Ahmed', guardian_phone: '01819-552410', gender: 'Male', class_level: 'HSC 1st Year', school_name: 'Dhaka Residential Model College', batch_id: 'batch-001', admission_date: '2026-02-05', monthly_fee: 4500, status: 'active' },
    { id: 'student-002', organization_id: organizationId, name: 'Nusrat Sultana', phone: '01912-338905', guardian_name: 'A. K. M. Selim', guardian_phone: '01713-774201', gender: 'Female', class_level: 'HSC 1st Year', school_name: 'Holy Cross College', batch_id: 'batch-001', admission_date: '2026-02-07', monthly_fee: 4500, status: 'active' },
    { id: 'student-003', organization_id: organizationId, name: 'Tanvir Hasan', phone: '01816-992341', guardian_name: 'Abul Hasan', guardian_phone: '01914-631092', gender: 'Male', class_level: 'Class 10', school_name: 'Notre Dame College School', batch_id: 'batch-002', admission_date: '2026-01-16', monthly_fee: 3500, status: 'active' },
    { id: 'student-004', organization_id: organizationId, name: 'Sadia Islam', phone: '01617-286450', guardian_name: 'Mizanur Rahman', guardian_phone: '01718-204533', gender: 'Female', class_level: 'Class 10', school_name: 'Viqarunnisa Noon School', batch_id: 'batch-002', admission_date: '2026-01-20', monthly_fee: 3500, status: 'active' },
    { id: 'student-005', organization_id: organizationId, name: 'Arif Hossain', phone: '01723-650184', guardian_name: 'Shafiq Hossain', guardian_phone: '01812-830911', gender: 'Male', class_level: 'Class 10', school_name: 'Ideal School & College', batch_id: 'batch-003', admission_date: '2026-01-29', monthly_fee: 3200, status: 'active' },
    { id: 'student-006', organization_id: organizationId, name: 'Mim Akter', phone: '01918-441702', guardian_name: 'Ruhul Amin', guardian_phone: '01612-889430', gender: 'Female', class_level: 'Class 10', school_name: 'Motijheel Model School', batch_id: 'batch-003', admission_date: '2026-02-02', monthly_fee: 3200, status: 'active' },
    { id: 'student-007', organization_id: organizationId, name: 'Sakib Chowdhury', phone: '01819-720615', guardian_name: 'Mahbub Chowdhury', guardian_phone: '01911-450782', gender: 'Male', class_level: 'Admission', school_name: 'Dhaka City College', batch_id: 'batch-004', admission_date: '2026-03-01', monthly_fee: 5500, status: 'active' },
    { id: 'student-008', organization_id: organizationId, name: 'Jannatul Ferdous', phone: '01715-302694', guardian_name: 'Nazrul Islam', guardian_phone: '01817-552804', gender: 'Female', class_level: 'Admission', school_name: 'Eden Mohila College', batch_id: 'batch-004', admission_date: '2026-03-03', monthly_fee: 5500, status: 'active' },
    { id: 'student-009', organization_id: organizationId, name: 'Tahmid Rahman', phone: '01924-817350', guardian_name: 'Faruq Rahman', guardian_phone: '01716-441120', gender: 'Male', class_level: 'Class 8', school_name: 'Dhanmondi Government Boys High School', batch_id: 'batch-005', admission_date: '2026-04-11', monthly_fee: 2800, status: 'active' },
    { id: 'student-010', organization_id: organizationId, name: 'Faria Haque', phone: '01682-499713', guardian_name: 'Shah Alam', guardian_phone: '01814-721903', gender: 'Female', class_level: 'Class 8', school_name: 'Dhanmondi Tutorial', batch_id: 'batch-005', admission_date: '2026-04-15', monthly_fee: 2800, status: 'active' },
    { id: 'student-011', organization_id: organizationId, name: 'Mehedi Hasan', phone: '01788-316540', guardian_name: 'Yasin Ali', guardian_phone: '01921-654302', gender: 'Male', class_level: 'Class 10', school_name: 'Government Science College', batch_id: 'batch-002', admission_date: '2026-05-02', monthly_fee: 3500, status: 'active' },
    { id: 'student-012', organization_id: organizationId, name: 'Raisa Kabir', phone: '01822-764190', guardian_name: 'Imran Kabir', guardian_phone: '01710-973551', gender: 'Female', class_level: 'HSC 1st Year', school_name: 'Dhaka City College', batch_id: 'batch-001', admission_date: '2026-05-09', monthly_fee: 4500, status: 'active' }
  ];

  const teachers = [
    { id: 'teacher-001', organization_id: organizationId, name: 'Mahmudul Hasan', phone: '01711-202945', email: 'mahmudul@eduflow.demo', specialization: 'Physics', designation: 'Senior Faculty', status: 'active' },
    { id: 'teacher-002', organization_id: organizationId, name: 'Farhana Yasmin', phone: '01817-445921', email: 'farhana@eduflow.demo', specialization: 'Biology', designation: 'Faculty', status: 'active' },
    { id: 'teacher-003', organization_id: organizationId, name: 'Shafiqul Islam', phone: '01912-672340', email: 'shafiqul@eduflow.demo', specialization: 'Accounting', designation: 'Faculty', status: 'active' },
    { id: 'teacher-004', organization_id: organizationId, name: 'Nayeem Hossain', phone: '01618-304221', email: 'nayeem@eduflow.demo', specialization: 'Higher Mathematics', designation: 'Senior Faculty', status: 'active' },
    { id: 'teacher-005', organization_id: organizationId, name: 'Sumaiya Akter', phone: '01719-550284', email: 'sumaiya@eduflow.demo', specialization: 'English', designation: 'Faculty', status: 'active' }
  ];

  const attendanceDates = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20'];
  const attendance = [];
  students.forEach((student, index) => {
    attendanceDates.forEach((date, dayIndex) => {
      const absent = (index + dayIndex) % 11 === 0 || (index === 1 && dayIndex === 2) || (index === 6 && dayIndex === 0);
      attendance.push({
        id: `att-${student.id}-${date}`,
        organization_id: organizationId,
        student_id: student.id,
        batch_id: student.batch_id,
        attendance_date: date,
        status: absent ? 'absent' : 'present',
        note: absent ? 'Guardian follow-up recommended' : '',
        students: { name: student.name },
        batches: { name: batches.find(b => b.id === student.batch_id)?.name || '' }
      });
    });
  });

  const payments = [
    { id: 'payment-001', organization_id: organizationId, student_id: 'student-001', amount: 4500, paid_at: '2026-08-20T16:15:00+06:00', method: 'bKash', reference: 'BK26A8F19', note: 'August tuition', students: { name: 'Rahim Ahmed' } },
    { id: 'payment-002', organization_id: organizationId, student_id: 'student-002', amount: 4500, paid_at: '2026-08-20T12:02:00+06:00', method: 'Nagad', reference: 'NG26P14K', note: 'August tuition', students: { name: 'Nusrat Sultana' } },
    { id: 'payment-003', organization_id: organizationId, student_id: 'student-003', amount: 3500, paid_at: '2026-08-19T18:20:00+06:00', method: 'Cash', reference: 'CASH-0819-03', note: 'August tuition', students: { name: 'Tanvir Hasan' } },
    { id: 'payment-004', organization_id: organizationId, student_id: 'student-004', amount: 3500, paid_at: '2026-08-19T17:05:00+06:00', method: 'bKash', reference: 'BK8C2Q10', note: 'August tuition', students: { name: 'Sadia Islam' } },
    { id: 'payment-005', organization_id: organizationId, student_id: 'student-005', amount: 3200, paid_at: '2026-08-18T18:42:00+06:00', method: 'Rocket', reference: 'RK-829103', note: 'August tuition', students: { name: 'Arif Hossain' } },
    { id: 'payment-006', organization_id: organizationId, student_id: 'student-006', amount: 3200, paid_at: '2026-08-18T16:14:00+06:00', method: 'Cash', reference: 'CASH-0818-06', note: 'August tuition', students: { name: 'Mim Akter' } },
    { id: 'payment-007', organization_id: organizationId, student_id: 'student-007', amount: 5500, paid_at: '2026-08-17T10:40:00+06:00', method: 'bKash', reference: 'BK4V8N20', note: 'August tuition', students: { name: 'Sakib Chowdhury' } },
    { id: 'payment-008', organization_id: organizationId, student_id: 'student-008', amount: 5500, paid_at: '2026-08-16T11:22:00+06:00', method: 'Bank Transfer', reference: 'DBBL-260816-88', note: 'August tuition', students: { name: 'Jannatul Ferdous' } },
    { id: 'payment-009', organization_id: organizationId, student_id: 'student-009', amount: 2800, paid_at: '2026-08-15T15:12:00+06:00', method: 'Cash', reference: 'CASH-0815-09', note: 'August tuition', students: { name: 'Tahmid Rahman' } },
    { id: 'payment-010', organization_id: organizationId, student_id: 'student-010', amount: 2800, paid_at: '2026-08-14T15:40:00+06:00', method: 'bKash', reference: 'BK0M7Y34', note: 'August tuition', students: { name: 'Faria Haque' } }
  ];

  const exams = [
    { id: 'exam-001', organization_id: organizationId, title: 'Monthly Assessment — Physics', exam_date: '2026-08-22', total_marks: 100, batch_id: 'batch-001', batches: { name: 'HSC 2027 • Science A' } },
    { id: 'exam-002', organization_id: organizationId, title: 'Model Test — SSC Science', exam_date: '2026-08-24', total_marks: 100, batch_id: 'batch-002', batches: { name: 'SSC 2027 • Science A' } },
    { id: 'exam-003', organization_id: organizationId, title: 'Accounting Chapter Test', exam_date: '2026-08-25', total_marks: 50, batch_id: 'batch-003', batches: { name: 'SSC 2027 • Commerce' } }
  ];

  const results = [
    { id: 'result-001', organization_id: organizationId, exam_id: 'exam-001', student_id: 'student-001', marks: 86, grade: 'A+' },
    { id: 'result-002', organization_id: organizationId, exam_id: 'exam-001', student_id: 'student-002', marks: 78, grade: 'A' },
    { id: 'result-003', organization_id: organizationId, exam_id: 'exam-002', student_id: 'student-003', marks: 91, grade: 'A+' },
    { id: 'result-004', organization_id: organizationId, exam_id: 'exam-002', student_id: 'student-004', marks: 74, grade: 'A' },
    { id: 'result-005', organization_id: organizationId, exam_id: 'exam-002', student_id: 'student-011', marks: 63, grade: 'A-' },
    { id: 'result-006', organization_id: organizationId, exam_id: 'exam-003', student_id: 'student-005', marks: 42, grade: 'A+' },
    { id: 'result-007', organization_id: organizationId, exam_id: 'exam-003', student_id: 'student-006', marks: 37, grade: 'A' }
  ].map(row => ({
    ...row,
    students: { name: students.find(s => s.id === row.student_id)?.name || 'Student' },
    exams: { title: exams.find(e => e.id === row.exam_id)?.title || 'Exam' }
  }));

  const notices = [
    { id: 'notice-001', organization_id: organizationId, title: 'Friday mock test starts at 9:00 AM', body: 'All Admission 2027 Engineering students should report by 8:45 AM.', published_at: '2026-08-20T09:00:00+06:00', status: 'published' },
    { id: 'notice-002', organization_id: organizationId, title: 'August fee collection closes on 25 August', body: 'Please clear outstanding August tuition before the monthly close.', published_at: '2026-08-18T10:15:00+06:00', status: 'published' },
    { id: 'notice-003', organization_id: organizationId, title: 'Guardian meeting — HSC Science', body: 'Guardian meeting will be held on Saturday at 3:00 PM in Hall 1.', published_at: '2026-08-16T14:30:00+06:00', status: 'published' }
  ];

  const profiles = [
    { id: 'demo-user-owner', organization_id: organizationId, full_name: 'Ahsan Kabir', role: 'owner', created_at: '2026-01-01T09:00:00+06:00' },
    { id: 'demo-user-admin', organization_id: organizationId, full_name: 'Nabila Rahman', role: 'admin', created_at: '2026-01-10T11:00:00+06:00' },
    { id: 'demo-user-teacher', organization_id: organizationId, full_name: 'Mahmudul Hasan', role: 'teacher', created_at: '2026-01-14T12:00:00+06:00' },
    { id: 'demo-user-staff', organization_id: organizationId, full_name: 'Jubayer Ahmed', role: 'staff', created_at: '2026-01-18T10:00:00+06:00' }
  ];

  const audit_logs = [
    { id: 'audit-001', organization_id: organizationId, user_id: 'demo-user-owner', action: 'payment.created', metadata: { student: 'Rahim Ahmed', amount: 4500 }, created_at: '2026-08-20T16:15:00+06:00' },
    { id: 'audit-002', organization_id: organizationId, user_id: 'demo-user-admin', action: 'attendance.marked', metadata: { batch: 'SSC 2027 • Science A' }, created_at: '2026-08-20T17:10:00+06:00' },
    { id: 'audit-003', organization_id: organizationId, user_id: 'demo-user-owner', action: 'student.updated', metadata: { student: 'Nusrat Sultana' }, created_at: '2026-08-19T13:45:00+06:00' }
  ];

  const byId = Object.fromEntries(students.map(row => [row.id, row]));

  const data = {
    organizations: [{ id: organizationId, name: 'Bright Future Coaching Center', phone: '02-55041288', district: 'Dhaka', created_at: '2026-01-01T09:00:00+06:00' }],
    profiles,
    organization_usage: [{ organization_id: organizationId, plan: 'pro', student_count: students.length, updated_at: now }],
    students: students.map(student => ({ ...student, batches: { name: batches.find(b => b.id === student.batch_id)?.name || '' } })),
    batches,
    teachers,
    attendance,
    payments,
    exams,
    results,
    notices,
    audit_logs,
    byId
  };

  window.EduFlowMockData = Object.freeze({
    organizationId,
    userId: 'demo-user-owner',
    session: Object.freeze({
      access_token: 'demo-access-token',
      refresh_token: 'demo-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: Object.freeze({ id: 'demo-user-owner', email: 'demo@eduflow.bd', user_metadata: { full_name: 'Ahsan Kabir' } })
    }),
    data
  });
})();
