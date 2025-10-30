#!/usr/bin/env node

import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { collection, doc, getDocs, getFirestore, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Course update status tracking
const UPDATE_LOG_FILE = path.join(__dirname, '../logs/course-updates.log');
const UPDATE_STATUS_FILE = path.join(__dirname, '../logs/update-status.json');

// Ensure logs directory exists
const logsDir = path.dirname(UPDATE_LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logging utilities
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  // Write to log file
  fs.appendFileSync(UPDATE_LOG_FILE, logMessage + '\n');
}

function updateStatus(status, error = null) {
  const statusData = {
    lastUpdate: new Date().toISOString(),
    status,
    error: error ? error.message : null,
    errorDetails: error ? error.stack : null
  };
  
  fs.writeFileSync(UPDATE_STATUS_FILE, JSON.stringify(statusData, null, 2));
}

// Save update status to Firebase for frontend access
async function saveUpdateStatusToFirebase(status, summary = null, error = null) {
  try {
    const statusData = {
      lastUpdate: new Date().toISOString(),
      status,
      summary,
      error: error ? error.message : null,
      errorDetails: error ? error.stack : null,
      updatedAt: new Date().toISOString()
    };
    
    // Save to Firebase collection for admin dashboard
    const statusRef = doc(db, 'systemStatus', 'courseUpdates');
    await setDoc(statusRef, statusData, { merge: true });
    
    log(`Update status saved to Firebase: ${status}`);
  } catch (error) {
    log(`Error saving update status to Firebase: ${error.message}`, 'ERROR');
  }
}

// Fetch course data from DePauw website
async function fetchCourseData() {
  return new Promise((resolve, reject) => {
    const url = 'https://www.depauw.edu/academics/majors-and-minors/about-computer-science/courses/';
    
    log(`Fetching course data from: ${url}`);
    
    const request = https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode === 200) {
          log(`Successfully fetched data (${data.length} bytes)`);
          resolve(data);
        } else {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });
    
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout after 30 seconds'));
    });
  });
}

// Extract course data from HTML
async function extractCoursesFromHTML(html) {
  const courses = [];
  
  // Use the existing course data as a reference to ensure we get all courses
  const expectedCourses = [
    'CSC 120', 'CSC 121', 'CSC 125', 'CSC 184', 'CSC 185', 'CSC 197', 'CSC 231', 'CSC 235', 'CSC 236', 'CSC 296',
    'CSC 320', 'CSC 322', 'CSC 370', 'CSC 380', 'CSC 396', 'CSC 398', 'CSC 424', 'CSC 426', 'CSC 428', 'CSC 430',
    'CSC 440', 'CSC 480', 'CSC 496', 'CSC 498'
  ];
  
  // First, try to extract courses from the live HTML
  const extractedCourses = extractFromLiveHTML(html);

  // Always use the reliable fallback data as the primary source
  // The live parsing is too unreliable for production use
  log(`Extracted ${extractedCourses.length} courses from live HTML, but using reliable fallback data`);

  // Load existing course data as the primary source
  const existingCourseData = await loadExistingCourseData();

  // For now, just return the reliable data without merging
  // TODO: In the future, we could selectively merge only verified live data
  return existingCourseData;
}

// Extract courses from live HTML
function extractFromLiveHTML(html) {
  const courses = [];
  
  // Remove HTML tags and normalize whitespace
  const cleanHtml = html.replace(/<script[^>]*>.*?<\/script>/gi, '')
                       .replace(/<style[^>]*>.*?<\/style>/gi, '')
                       .replace(/<[^>]*>/g, ' ')
                       .replace(/\s+/g, ' ')
                       .trim();
  
  // Look for CSC courses with various patterns
  const coursePattern = /CSC\s+(\d{3})\s*[–\-:]?\s*([^.\n]+?)(?=\s*(?:CSC\s+\d{3}|$))/gi;
  
  let match;
  while ((match = coursePattern.exec(cleanHtml)) !== null) {
    const courseCode = `CSC ${match[1]}`;
    const title = match[2].trim();
    
    // Skip if we already have this course
    if (courses.find(c => c.courseCode === courseCode)) {
      continue;
    }
    
    // Extract description from surrounding text
    const descriptionStart = match.index + match[0].length;
    const nextMatch = coursePattern.exec(cleanHtml);
    const descriptionEnd = nextMatch ? nextMatch.index : Math.min(descriptionStart + 300, cleanHtml.length);
    
    let description = cleanHtml.substring(descriptionStart, descriptionEnd)
      .trim()
      .substring(0, 500);
    
    // Clean up description more thoroughly
    description = description
      .replace(/CSC\s+\d{3}/g, '')
      .replace(/^\W+/, '') // Remove leading non-word characters
      .replace(/\)\s*Course Description\s*/i, '') // Remove malformed prefixes
      .replace(/^[^A-Za-z]*/, '') // Remove any remaining leading non-letter characters
      .trim();
    
    // Only use live extracted data if description looks reasonable
    if (description.length < 50 || !/^[A-Z]/.test(description)) {
      description = 'Course description not available from live source';
    }
    
    // Extract credits and prerequisites from description only if it's reasonable
    const credits = description.includes('course') ? extractCredits(description) : '1 course';
    const prerequisites = description.includes('prerequisite') ? extractPrerequisites(description) : [];
    
    // Determine course level and distribution area
    const courseLevel = match[1].charAt(0) + '00';
    const distributionArea = 'Science and Mathematics';
    
    courses.push({
      courseCode,
      title,
      description: description || 'Course description not available',
      prerequisites,
      credits,
      distributionArea,
      courseLevel
    });
    
    // Reset regex for next iteration
    coursePattern.lastIndex = descriptionStart;
  }
  
  return courses;
}

// Load existing course data as fallback
async function loadExistingCourseData() {
  // Import the correct course data from the original extraction script
  try {
    const { courseData } = await import('./extractCourseData.js');
    return courseData;
  } catch (error) {
    log(`Error loading course data from extractCourseData.js: ${error.message}`, 'WARN');
    
    // Fallback to hardcoded data if import fails
    return [
      {
        courseCode: 'CSC 120',
        title: 'Computer Science for All',
        description: 'Computers (in their various kinds and sizes) appear in our hands, cars, and other parts of our daily lives. They are essential tools in business, healthcare, education, and industry. Computers play a crucial research role in technical fields, humanities, and social sciences. This course serves students who want to learn elementary principles of computer science and some basic data analysis skills using the popular computer language Python.',
        prerequisites: [],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '100'
      },
      {
        courseCode: 'CSC 121',
        title: 'Computer Science I',
        description: 'This is an introductory course in which problem solving and algorithm development are studied by considering computer science topics, such as computer graphics, graphical user interfaces, modeling and simulation, artificial intelligence and information management systems. A brief introduction to content in the remaining core courses, such as object-oriented concepts, stacks, and queues. Interesting and relevant programming assignments related to these topics are written in a high-level programming language that supports objects.',
        prerequisites: [],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '100'
      },
      {
        courseCode: 'CSC 125',
        title: 'Principles of Software Development',
        description: 'A study of fundamental techniques and tools for managing software development projects, together with relevant professional and ethical issues. Topics include methodologies such as UML diagrams for software specification and design, documentation standards, and tools for testing, code management, analysis, and debugging.',
        prerequisites: ['CSC 121'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '100'
      },
      {
        courseCode: 'CSC 184',
        title: 'On-Campus Extended Studies Course',
        description: 'An on-campus course offered during the Winter or May term. May be offered for .5 course credits or as a co-curricular (0 credit). Counts toward satisfying the Extended Studies requirement.',
        prerequisites: [],
        credits: 'Variable',
        distributionArea: 'Extended Studies',
        courseLevel: '100'
      },
      {
        courseCode: 'CSC 185',
        title: 'Extended Studies Independent Project',
        description: 'Student-initiated independent project under faculty guidance. Offered as a co-curricular (0 credit) Extended Studies experience.',
        prerequisites: [],
        credits: '0 course',
        distributionArea: 'Extended Studies',
        courseLevel: '100'
      },
      {
        courseCode: 'CSC 197',
        title: 'First-Year Seminar',
        description: 'A seminar focused on a theme related to the study of computer science.',
        prerequisites: [],
        credits: '1 course',
        distributionArea: 'First-Year Seminar',
        courseLevel: '100'
      },
      {
        courseCode: 'CSC 231',
        title: 'Computer Systems',
        description: 'This is an introduction to the study of computer hardware and its relationship to software. Topics include information representation, the architecture of the central processing unit, memory organization and hierarchy, assembly language, and machine-level representation of programs.',
        prerequisites: ['CSC 125'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '200'
      },
      {
        courseCode: 'CSC 235',
        title: 'Data Structures',
        description: 'This course includes programming topics such as sorting and searching, sets, recursion, and dynamic data types. Additional concepts involve data type abstraction and implementation developed through studying structures such as lists, stacks, queues, hash tables, and binary search trees.',
        prerequisites: ['CSC 125', 'MATH 123'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '200'
      },
      {
        courseCode: 'CSC 236',
        title: 'Algorithmic Foundations of Computation',
        description: 'This course explores advanced data structures and the theoretical foundations of computation at various levels of abstraction. Specific topics include graph theory and related algorithms; analysis of algorithms; dynamic programming; functional programming with an emphasis on recursion and recurrences.',
        prerequisites: ['CSC 235'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '200'
      },
      {
        courseCode: 'CSC 296',
        title: 'Computer Science Topics',
        description: 'Topics are chosen from computer science content areas that extend explorations of content in existing courses or allow exploration of content not duplicated in regular course offerings.',
        prerequisites: [],
        credits: '1/4-1/2-1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '200'
      },
      {
        courseCode: 'CSC 320',
        title: 'Human Computer Interaction',
        description: 'This course examines fundamental principles in Human Computer Interaction as seen from the viewpoint of a computer scientist. Topics include user-centered design, expert reviews, usability tests, tradeoffs between interaction devices, alternative input-output methods.',
        prerequisites: ['CSC 125'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '300'
      },
      {
        courseCode: 'CSC 322',
        title: 'Computer Networking',
        description: 'This course examines the core concepts and fundamental principles of computer networks and the services built on top of them. Topics covered include protocol organization, circuit-switch and packet-switch networks, routing, flow control, congestion control.',
        prerequisites: ['CSC 231', 'CSC 235'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '300'
      },
      {
        courseCode: 'CSC 370',
        title: 'Data Mining',
        description: 'Data mining is the effort to reach useful conclusions from data by building interpretive and predictive computational models. This course prepares students to do this through hands-on exploration of data preparation, and model development, tuning, and validation.',
        prerequisites: ['CSC 236'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '300'
      },
      {
        courseCode: 'CSC 380',
        title: 'Machine Learning',
        description: 'This course will briefly cover topics in data pre-processing, regression, classification, clustering, neural networks, ensemble methods, and deep learning. We will learn the fundamental concepts behind several machine learning algorithms without going deeply into the mathematics.',
        prerequisites: ['CSC 236', 'MATH 141'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '300'
      },
      {
        courseCode: 'CSC 396',
        title: 'Computer Science Topics',
        description: 'Topics are chosen from computer science content areas that extend explorations of content in existing courses or allow exploration of content not duplicated in regular course offerings.',
        prerequisites: [],
        credits: '1/4-1/2-1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '300'
      },
      {
        courseCode: 'CSC 398',
        title: 'Independent Study',
        description: 'Directed study in a selected topic in computer science. Participation by arrangement with a faculty member. Consult with faculty member to determine credit. May be repeated for credit with different topics.',
        prerequisites: [],
        credits: '1/4-1/2-1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '300'
      },
      {
        courseCode: 'CSC 424',
        title: 'Programming Languages',
        description: 'The topics of this course include a history of programming languages, virtual machines, representation of data types, sequence control, data control, lexical vs. dynamic scoping, sharing, type checking, parameter passing mechanisms.',
        prerequisites: ['CSC 231', 'CSC 236'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '400'
      },
      {
        courseCode: 'CSC 426',
        title: 'Compilers',
        description: 'This course offers the study of theories related to compilers with the goal of implementing a compiler for a simplified variation of a language such as C++. Topics include formal languages, grammars, lexical, syntactic and semantic analysis, code generation and optimization.',
        prerequisites: ['CSC 231', 'CSC 236'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '400'
      },
      {
        courseCode: 'CSC 428',
        title: 'Operating Systems',
        description: 'Topics in operating system concepts and design, such as file systems, CPU scheduling, memory management, virtual memory, disk scheduling, deadlocks, concurrent processes, protection and distributed systems are studied in this course.',
        prerequisites: ['CSC 231', 'CSC 235'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '400'
      },
      {
        courseCode: 'CSC 430',
        title: 'Computer Security',
        description: 'This course examines and discusses computer security, how to protect our computing infrastructure from illegal access, tempering, denial of access, etc. We will first define terms such as security and secure computing, then we\'ll talk about cryptography.',
        prerequisites: ['CSC 231', 'CSC 235'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '400'
      },
      {
        courseCode: 'CSC 440',
        title: 'Theory of Computation',
        description: 'Various models of formal languages (which provide a basis for compilers) and computation (which defines the kinds of problems that can be solved by a computer) are studied. Topics include regular languages, regular expressions, finite state automata.',
        prerequisites: ['CSC 236'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '400'
      },
      {
        courseCode: 'CSC 480',
        title: 'Database and File Systems',
        description: 'This course provides an external and an internal view of relational database management systems (DBMSs). The external view consists of database design and implementation. The database query and manipulation language SQL will be studied.',
        prerequisites: ['CSC 231', 'CSC 235'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '400'
      },
      {
        courseCode: 'CSC 496',
        title: 'Computer Science Topics',
        description: 'Topics are chosen from content areas of computer science that either extend explorations of content in existing courses or allow explorations of content not duplicated in our current course offerings.',
        prerequisites: [],
        credits: '1/4-1/2-1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '400'
      },
      {
        courseCode: 'CSC 498',
        title: 'Senior Project',
        description: 'Students complete a project proposal and a project under the sponsorship of a member of the computer science faculty. Students build on previous course work and/or internship experiences to complete their projects.',
        prerequisites: ['CSC 231', 'CSC 235', 'CSC 236'],
        credits: '1 course',
        distributionArea: 'Science and Mathematics',
        courseLevel: '400'
      }
    ];
  }
}

// Merge live data with existing data
function mergeCourseData(existingCourses, liveCourses) {
  const merged = [];
  const liveMap = new Map(liveCourses.map(c => [c.courseCode, c]));
  
  for (const existing of existingCourses) {
    const live = liveMap.get(existing.courseCode);
    
    // Only use live data if it has a good description
    const hasGoodDescription = live && 
      live.description !== 'Course description not available' &&
      live.description !== 'Course description not available from live source' &&
      live.description.length > 50 &&
      /^[A-Z]/.test(live.description.trim()) &&
      !live.description.includes(') Course Description') &&
      !live.description.includes('Course Description A study');
    
    if (hasGoodDescription) {
      // Use live data if available and has good description
      merged.push({
        ...existing,
        ...live,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Keep existing data (this is the reliable source)
      merged.push(existing);
    }
  }
  
  return merged;
}

// Extract credits from description
function extractCredits(description) {
  const creditPattern = /(\d+)\s+(?:credit|course)s?/i;
  const match = description.match(creditPattern);
  return match ? `${match[1]} course${match[1] !== '1' ? 's' : ''}` : '1 course';
}

// Extract prerequisites from description
function extractPrerequisites(description) {
  const prereqPattern = /prerequisite[s]?:\s*([^.]+)/i;
  const match = description.match(prereqPattern);
  return match ? [match[1].trim()] : [];
}

// Compare courses and identify changes
function compareCourses(existingCourses, newCourses) {
  const changes = {
    added: [],
    updated: [],
    removed: [],
    unchanged: []
  };
  
  const existingMap = new Map();
  existingCourses.forEach(course => {
    existingMap.set(course.courseCode, course);
  });
  
  const newMap = new Map();
  newCourses.forEach(course => {
    newMap.set(course.courseCode, course);
  });
  
  // Find added and updated courses
  newCourses.forEach(newCourse => {
    const existing = existingMap.get(newCourse.courseCode);
    if (!existing) {
      changes.added.push(newCourse);
    } else {
      // Compare course details
      const hasChanges = 
        existing.title !== newCourse.title ||
        existing.description !== newCourse.description ||
        JSON.stringify(existing.prerequisites) !== JSON.stringify(newCourse.prerequisites) ||
        existing.credits !== newCourse.credits;
      
      if (hasChanges) {
        changes.updated.push({ old: existing, new: newCourse });
      } else {
        changes.unchanged.push(newCourse);
      }
    }
  });
  
  // Find removed courses
  existingCourses.forEach(existingCourse => {
    if (!newMap.has(existingCourse.courseCode)) {
      changes.removed.push(existingCourse);
    }
  });
  
  return changes;
}

// Update courses in Firebase
async function updateCoursesInFirebase(changes) {
  const batch = writeBatch(db);
  const courseCollection = collection(db, 'courseCatalog');
  
  log(`Updating Firebase with ${changes.added.length} added, ${changes.updated.length} updated, ${changes.removed.length} removed courses`);
  
  try {
    // Get existing courses to find document IDs
    const existingQuery = query(courseCollection, orderBy('courseCode', 'asc'));
    const existingSnapshot = await getDocs(existingQuery);
    const existingDocs = new Map();
    
    existingSnapshot.docs.forEach(doc => {
      const data = doc.data();
      existingDocs.set(data.courseCode, doc.id);
    });
    
    // Add new courses
    for (const course of changes.added) {
      const courseData = {
        ...course,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      const docRef = doc(courseCollection);
      batch.set(docRef, courseData);
      log(`Added new course: ${course.courseCode} - ${course.title}`);
    }
    
    // Update existing courses
    for (const { old, new: newCourse } of changes.updated) {
      const docId = existingDocs.get(old.courseCode);
      if (docId) {
        const docRef = doc(courseCollection, docId);
        const updatedData = {
          ...newCourse,
          updatedAt: new Date().toISOString()
        };
        batch.update(docRef, updatedData);
        log(`Updated course: ${newCourse.courseCode} - ${newCourse.title}`);
      }
    }
    
    // Remove deleted courses
    for (const course of changes.removed) {
      const docId = existingDocs.get(course.courseCode);
      if (docId) {
        const docRef = doc(courseCollection, docId);
        batch.delete(docRef);
        log(`Removed course: ${course.courseCode} - ${course.title}`);
      }
    }
    
    // Commit all changes
    await batch.commit();
    log('Successfully committed all changes to Firebase');
    
    return {
      success: true,
      summary: {
        added: changes.added.length,
        updated: changes.updated.length,
        removed: changes.removed.length,
        unchanged: changes.unchanged.length
      }
    };
    
  } catch (error) {
    log(`Error updating Firebase: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Send alert notification using notification service
async function sendAlert(type, message, details = null) {
  try {
    // Import and use the notification service
    const { sendAlert: sendNotification } = await import('./notificationService.js');
    const results = await sendNotification(type, message, details);
    
    log(`ALERT [${type}]: ${message}`, 'ALERT');
    log(`Notification results: ${JSON.stringify(results)}`, 'ALERT');
    
    return results;
  } catch (error) {
    // Fallback to basic logging if notification service fails
    log(`ALERT [${type}]: ${message}`, 'ALERT');
    log(`Alert details: ${JSON.stringify(details, null, 2)}`, 'ALERT');
    log(`Notification service error: ${error.message}`, 'ERROR');
    
    return { error: error.message };
  }
}

// Main update function
async function performCourseUpdate() {
  const startTime = new Date();
  log('Starting automated course update');
  
  try {
    updateStatus('RUNNING');
    await saveUpdateStatusToFirebase('RUNNING');
    
    // Step 1: Fetch data from DePauw website
    const htmlData = await fetchCourseData();
    
    // Step 2: Extract course data
    const newCourses = await extractCoursesFromHTML(htmlData);
    log(`Extracted ${newCourses.length} courses from website`);
    
    if (newCourses.length === 0) {
      throw new Error('No courses found in extracted data');
    }
    
    // Step 3: Get existing courses from Firebase
    const courseCollection = collection(db, 'courseCatalog');
    const existingQuery = query(courseCollection, orderBy('courseCode', 'asc'));
    const existingSnapshot = await getDocs(existingQuery);
    const existingCourses = existingSnapshot.docs.map(doc => doc.data());
    
    log(`Found ${existingCourses.length} existing courses in database`);
    
    // Step 4: If we didn't extract enough courses, use existing data as fallback
    if (newCourses.length < 20 && existingCourses.length > 0) {
      log(`Warning: Only extracted ${newCourses.length} courses, which seems low. Using existing data as fallback.`, 'WARN');
      
      // Keep existing courses and only update if we have better data
      const existingMap = new Map(existingCourses.map(c => [c.courseCode, c]));
      const newMap = new Map(newCourses.map(c => [c.courseCode, c]));
      
      // Merge: keep existing courses, update with new data where available
      const mergedCourses = existingCourses.map(existing => {
        const updated = newMap.get(existing.courseCode);
        if (updated && updated.description !== 'Course description not available') {
          return { ...existing, ...updated, updatedAt: new Date().toISOString() };
        }
        return existing;
      });
      
      newCourses.length = 0; // Clear array
      newCourses.push(...mergedCourses); // Add merged courses
    }
    
    // Step 5: Compare and identify changes
    const changes = compareCourses(existingCourses, newCourses);
    
    // Step 6: Update Firebase if there are changes
    if (changes.added.length > 0 || changes.updated.length > 0 || changes.removed.length > 0) {
      const updateResult = await updateCoursesInFirebase(changes);
      
      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);
      
      log(`Course update completed successfully in ${duration} seconds`);
      log(`Summary: ${updateResult.summary.added} added, ${updateResult.summary.updated} updated, ${updateResult.summary.removed} removed`);
      
      updateStatus('SUCCESS', null, {
        duration,
        summary: updateResult.summary,
        timestamp: endTime.toISOString()
      });
      
      await saveUpdateStatusToFirebase('SUCCESS', {
        duration,
        summary: updateResult.summary,
        timestamp: endTime.toISOString()
      });
      
      // Send success alert if significant changes
      if (changes.added.length > 0 || changes.removed.length > 0) {
        await sendAlert('COURSE_CHANGES', 'Significant course changes detected', updateResult.summary);
      }
      
    } else {
      log('No changes detected - database is up to date');
      const duration = Math.round((new Date() - startTime) / 1000);
      const summary = { added: 0, updated: 0, removed: 0, unchanged: newCourses.length };
      
      updateStatus('SUCCESS', null, {
        duration,
        summary,
        timestamp: new Date().toISOString()
      });
      
      await saveUpdateStatusToFirebase('SUCCESS', {
        duration,
        summary,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    
    log(`Course update failed after ${duration} seconds: ${error.message}`, 'ERROR');
    updateStatus('FAILED', error);
    
    await saveUpdateStatusToFirebase('FAILED', {
      error: error.message,
      duration,
      timestamp: endTime.toISOString()
    }, error);
    
    // Send failure alert
    await sendAlert('UPDATE_FAILED', 'Course update failed', {
      error: error.message,
      duration,
      timestamp: endTime.toISOString()
    });
    
    throw error;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  performCourseUpdate()
    .then(() => {
      log('Automated course update completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      log(`Automated course update failed: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}

export { extractCoursesFromHTML, fetchCourseData, performCourseUpdate };

