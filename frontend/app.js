// API Base URL - will be set from config.js or default to spring-service
const API_BASE_URL = window.API_BASE_URL || (typeof API_CONFIG !== 'undefined' ? API_CONFIG.API_BASE_URL : 'http://spring-service:8080');

// Tab Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Activate corresponding tab
    event.target.classList.add('active');
    
    // Load data when switching tabs
    if (sectionName === 'departments') {
        loadDepartments();
    } else if (sectionName === 'students') {
        loadStudents();
        loadDepartmentsForSelect();
    } else if (sectionName === 'enrollments') {
        loadEnrollments();
        loadStudentsForSelect();
    }
}

// ============ DEPARTMENT FUNCTIONS ============
async function loadDepartments() {
    const listDiv = document.getElementById('departmentsList');
    listDiv.innerHTML = '<div class="loading">Loading departments...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/Depatment/getAllDepartment`);
        if (!response.ok) throw new Error('Failed to fetch departments');
        
        const departments = await response.json();
        
        if (departments.length === 0) {
            listDiv.innerHTML = '<div class="empty">No departments found. Add one to get started!</div>';
            return;
        }
        
        listDiv.innerHTML = departments.map(dept => `
            <div class="data-card">
                <h3>${dept.name || 'N/A'}</h3>
                <p><strong>Location:</strong> ${dept.location || 'N/A'}</p>
                <p><strong>Phone:</strong> ${dept.phone || 'N/A'}</p>
                <p><strong>Head:</strong> ${dept.head || 'N/A'}</p>
                <div class="actions">
                    <button onclick="editDepartment(${dept.idDepartment})" class="btn btn-primary">Edit</button>
                    <button onclick="deleteDepartment(${dept.idDepartment})" class="btn btn-danger">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        listDiv.innerHTML = `<div class="error">Error loading departments: ${error.message}</div>`;
        console.error('Error:', error);
    }
}

function showDepartmentForm() {
    document.getElementById('departmentForm').style.display = 'block';
    document.getElementById('departmentFormElement').reset();
    document.getElementById('deptId').value = '';
}

function hideDepartmentForm() {
    document.getElementById('departmentForm').style.display = 'none';
}

async function saveDepartment(event) {
    event.preventDefault();
    
    const department = {
        idDepartment: document.getElementById('deptId').value || null,
        name: document.getElementById('deptName').value,
        location: document.getElementById('deptLocation').value,
        phone: document.getElementById('deptPhone').value,
        head: document.getElementById('deptHead').value
    };
    
    const url = department.idDepartment 
        ? `${API_BASE_URL}/Depatment/updateDepartment`
        : `${API_BASE_URL}/Depatment/createDepartment`;
    
    const method = department.idDepartment ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(department)
        });
        
        if (!response.ok) throw new Error('Failed to save department');
        
        hideDepartmentForm();
        loadDepartments();
    } catch (error) {
        alert('Error saving department: ' + error.message);
        console.error('Error:', error);
    }
}

async function editDepartment(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/Depatment/getDepartment/${id}`);
        if (!response.ok) throw new Error('Failed to fetch department');
        
        const dept = await response.json();
        
        document.getElementById('deptId').value = dept.idDepartment;
        document.getElementById('deptName').value = dept.name || '';
        document.getElementById('deptLocation').value = dept.location || '';
        document.getElementById('deptPhone').value = dept.phone || '';
        document.getElementById('deptHead').value = dept.head || '';
        
        document.getElementById('departmentForm').style.display = 'block';
    } catch (error) {
        alert('Error loading department: ' + error.message);
        console.error('Error:', error);
    }
}

async function deleteDepartment(id) {
    if (!confirm('Are you sure you want to delete this department?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/Depatment/deleteDepartment/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete department');
        
        loadDepartments();
    } catch (error) {
        alert('Error deleting department: ' + error.message);
        console.error('Error:', error);
    }
}

// ============ STUDENT FUNCTIONS ============
async function loadStudents() {
    const listDiv = document.getElementById('studentsList');
    listDiv.innerHTML = '<div class="loading">Loading students...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/students/getAllStudents`);
        if (!response.ok) throw new Error('Failed to fetch students');
        
        const students = await response.json();
        
        if (students.length === 0) {
            listDiv.innerHTML = '<div class="empty">No students found. Add one to get started!</div>';
            return;
        }
        
        listDiv.innerHTML = students.map(student => `
            <div class="data-card">
                <h3>${student.firstName || ''} ${student.lastName || ''}</h3>
                <p><strong>Email:</strong> ${student.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${student.phone || 'N/A'}</p>
                <p><strong>Date of Birth:</strong> ${student.dateOfBirth || 'N/A'}</p>
                <p><strong>Address:</strong> ${student.address || 'N/A'}</p>
                <p><strong>Department:</strong> ${student.department ? student.department.name : 'N/A'}</p>
                <div class="actions">
                    <button onclick="editStudent(${student.idStudent})" class="btn btn-primary">Edit</button>
                    <button onclick="deleteStudent(${student.idStudent})" class="btn btn-danger">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        listDiv.innerHTML = `<div class="error">Error loading students: ${error.message}</div>`;
        console.error('Error:', error);
    }
}

async function loadDepartmentsForSelect() {
    try {
        const response = await fetch(`${API_BASE_URL}/Depatment/getAllDepartment`);
        if (!response.ok) return;
        
        const departments = await response.json();
        const select = document.getElementById('studentDepartment');
        
        select.innerHTML = '<option value="">Select Department</option>' +
            departments.map(dept => 
                `<option value="${dept.idDepartment}">${dept.name}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

function showStudentForm() {
    document.getElementById('studentForm').style.display = 'block';
    document.getElementById('studentFormElement').reset();
    document.getElementById('studentId').value = '';
    loadDepartmentsForSelect();
}

function hideStudentForm() {
    document.getElementById('studentForm').style.display = 'none';
}

async function saveStudent(event) {
    event.preventDefault();
    
    const deptId = document.getElementById('studentDepartment').value;
    const department = deptId ? { idDepartment: parseInt(deptId) } : null;
    
    const student = {
        idStudent: document.getElementById('studentId').value || null,
        firstName: document.getElementById('studentFirstName').value,
        lastName: document.getElementById('studentLastName').value,
        email: document.getElementById('studentEmail').value,
        phone: document.getElementById('studentPhone').value,
        dateOfBirth: document.getElementById('studentDob').value,
        address: document.getElementById('studentAddress').value,
        department: department
    };
    
    const url = student.idStudent 
        ? `${API_BASE_URL}/students/updateStudent`
        : `${API_BASE_URL}/students/createStudent`;
    
    const method = student.idStudent ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(student)
        });
        
        if (!response.ok) throw new Error('Failed to save student');
        
        hideStudentForm();
        loadStudents();
    } catch (error) {
        alert('Error saving student: ' + error.message);
        console.error('Error:', error);
    }
}

async function editStudent(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/getStudent/${id}`);
        if (!response.ok) throw new Error('Failed to fetch student');
        
        const student = await response.json();
        
        document.getElementById('studentId').value = student.idStudent;
        document.getElementById('studentFirstName').value = student.firstName || '';
        document.getElementById('studentLastName').value = student.lastName || '';
        document.getElementById('studentEmail').value = student.email || '';
        document.getElementById('studentPhone').value = student.phone || '';
        document.getElementById('studentDob').value = student.dateOfBirth || '';
        document.getElementById('studentAddress').value = student.address || '';
        
        await loadDepartmentsForSelect();
        if (student.department) {
            document.getElementById('studentDepartment').value = student.department.idDepartment;
        }
        
        document.getElementById('studentForm').style.display = 'block';
    } catch (error) {
        alert('Error loading student: ' + error.message);
        console.error('Error:', error);
    }
}

async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/students/deleteStudent/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete student');
        
        loadStudents();
    } catch (error) {
        alert('Error deleting student: ' + error.message);
        console.error('Error:', error);
    }
}

// ============ ENROLLMENT FUNCTIONS ============
async function loadEnrollments() {
    const listDiv = document.getElementById('enrollmentsList');
    listDiv.innerHTML = '<div class="loading">Loading enrollments...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/Enrollment/getAllEnrollment`);
        if (!response.ok) throw new Error('Failed to fetch enrollments');
        
        const enrollments = await response.json();
        
        if (enrollments.length === 0) {
            listDiv.innerHTML = '<div class="empty">No enrollments found. Add one to get started!</div>';
            return;
        }
        
        listDiv.innerHTML = enrollments.map(enrollment => `
            <div class="data-card">
                <h3>Enrollment #${enrollment.idEnrollment || 'N/A'}</h3>
                <p><strong>Student:</strong> ${enrollment.student ? enrollment.student.firstName + ' ' + enrollment.student.lastName : 'N/A'}</p>
                <p><strong>Course ID:</strong> ${enrollment.course ? enrollment.course.idCourse : 'N/A'}</p>
                <p><strong>Course:</strong> ${enrollment.course ? enrollment.course.name : 'N/A'}</p>
                <p><strong>Status:</strong> ${enrollment.status || 'N/A'}</p>
                <p><strong>Enrollment Date:</strong> ${enrollment.enrollmentDate || 'N/A'}</p>
                <p><strong>Grade:</strong> ${enrollment.grade !== null && enrollment.grade !== undefined ? enrollment.grade : 'N/A'}</p>
                <div class="actions">
                    <button onclick="editEnrollment(${enrollment.idEnrollment})" class="btn btn-primary">Edit</button>
                    <button onclick="deleteEnrollment(${enrollment.idEnrollment})" class="btn btn-danger">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        listDiv.innerHTML = `<div class="error">Error loading enrollments: ${error.message}</div>`;
        console.error('Error:', error);
    }
}

async function loadStudentsForSelect() {
    try {
        const response = await fetch(`${API_BASE_URL}/students/getAllStudents`);
        if (!response.ok) return;
        
        const students = await response.json();
        const select = document.getElementById('enrollmentStudent');
        
        select.innerHTML = '<option value="">Select Student</option>' +
            students.map(student => 
                `<option value="${student.idStudent}">${student.firstName} ${student.lastName}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function showEnrollmentForm() {
    document.getElementById('enrollmentForm').style.display = 'block';
    document.getElementById('enrollmentFormElement').reset();
    document.getElementById('enrollmentId').value = '';
    loadStudentsForSelect();
}

function hideEnrollmentForm() {
    document.getElementById('enrollmentForm').style.display = 'none';
}

async function saveEnrollment(event) {
    event.preventDefault();
    
    const enrollment = {
        idEnrollment: document.getElementById('enrollmentId').value || null,
        student: { idStudent: parseInt(document.getElementById('enrollmentStudent').value) },
        course: { idCourse: parseInt(document.getElementById('enrollmentCourseId').value) },
        status: document.getElementById('enrollmentStatus').value
    };
    
    const url = enrollment.idEnrollment 
        ? `${API_BASE_URL}/Enrollment/updateEnrollment`
        : `${API_BASE_URL}/Enrollment/createEnrollment`;
    
    const method = enrollment.idEnrollment ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(enrollment)
        });
        
        if (!response.ok) throw new Error('Failed to save enrollment');
        
        hideEnrollmentForm();
        loadEnrollments();
    } catch (error) {
        alert('Error saving enrollment: ' + error.message);
        console.error('Error:', error);
    }
}

async function editEnrollment(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/Enrollment/getEnrollment/${id}`);
        if (!response.ok) throw new Error('Failed to fetch enrollment');
        
        const enrollment = await response.json();
        
        document.getElementById('enrollmentId').value = enrollment.idEnrollment || '';
        document.getElementById('enrollmentStatus').value = enrollment.status || '';
        document.getElementById('enrollmentCourseId').value = enrollment.course ? enrollment.course.idCourse : '';
        
        await loadStudentsForSelect();
        if (enrollment.student) {
            document.getElementById('enrollmentStudent').value = enrollment.student.idStudent;
        }
        
        document.getElementById('enrollmentForm').style.display = 'block';
    } catch (error) {
        alert('Error loading enrollment: ' + error.message);
        console.error('Error:', error);
    }
}

async function deleteEnrollment(id) {
    if (!confirm('Are you sure you want to delete this enrollment?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/Enrollment/deleteEnrollment/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete enrollment');
        
        loadEnrollments();
    } catch (error) {
        alert('Error deleting enrollment: ' + error.message);
        console.error('Error:', error);
    }
}

// Load departments on page load
window.addEventListener('DOMContentLoaded', () => {
    loadDepartments();
});

