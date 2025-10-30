// Seed script to create initial users for the TA Calendar system
// Run this with: node scripts/seedUsers.js

import { initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { doc, getFirestore, setDoc } from 'firebase/firestore'

// Import your Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.VITE_FIREBASE_APP_ID || "your-app-id"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const users = [
  // Admin Professors (hardcoded in adminConfig.js)
  {
    email: 'samicheema_2026@depauw.edu',
    password: 'password123',
    displayName: 'Dr. Sarah Smith',
    role: 'professor',
    pronouns: 'she/her',
    isAdmin: true
  },
  {
    email: 'prof.jones@depauw.edu',
    password: 'password123',
    displayName: 'Dr. Michael Jones',
    role: 'professor',
    pronouns: 'he/him',
    isAdmin: true
  },
  
  // Teaching Assistants (hardcoded assignments in adminConfig.js)
  {
    email: 'ta.john@depauw.edu',
    password: 'password123',
    displayName: 'John Doe',
    role: 'ta',
    major: 'Computer Science',
    pronouns: 'he/him',
    year: 'Senior',
    bio: 'Experienced TA with expertise in data structures and algorithms',
    assignedCourses: ['CS101', 'CS401']
  },
  {
    email: 'ta.jane@depauw.edu',
    password: 'password123',
    displayName: 'Jane Wilson',
    role: 'ta',
    major: 'Computer Science',
    pronouns: 'she/her',
    year: 'Junior',
    bio: 'Passionate about software engineering and database systems',
    assignedCourses: ['CS101']
  },
  {
    email: 'ta.mike@depauw.edu',
    password: 'password123',
    displayName: 'Mike Chen',
    role: 'ta',
    major: 'Computer Science',
    pronouns: 'he/him',
    year: 'Senior',
    bio: 'Specializes in web development and mobile applications',
    assignedCourses: ['CS201']
  },
  {
    email: 'ta.sarah@depauw.edu',
    password: 'password123',
    displayName: 'Sarah Johnson',
    role: 'ta',
    major: 'Computer Science',
    pronouns: 'she/her',
    year: 'Graduate',
    bio: 'Graduate student with focus on machine learning and AI',
    assignedCourses: ['CS301', 'CS401']
  },
  
  // Students
  {
    email: 'student.alice@depauw.edu',
    password: 'password123',
    displayName: 'Alice Brown',
    role: 'student',
    major: 'Computer Science',
    pronouns: 'she/her',
    year: 'Sophomore',
    bio: 'Interested in web development and user experience design'
  },
  {
    email: 'student.bob@depauw.edu',
    password: 'password123',
    displayName: 'Bob Davis',
    role: 'student',
    major: 'Computer Science',
    pronouns: 'he/him',
    year: 'Freshman',
    bio: 'New to programming, eager to learn!'
  },
  {
    email: 'student.carol@depauw.edu',
    password: 'password123',
    displayName: 'Carol Martinez',
    role: 'student',
    major: 'Computer Science',
    pronouns: 'she/her',
    year: 'Junior',
    bio: 'Focusing on cybersecurity and network security'
  },
  {
    email: 'student.david@depauw.edu',
    password: 'password123',
    displayName: 'David Lee',
    role: 'student',
    major: 'Computer Science',
    pronouns: 'he/him',
    year: 'Senior',
    bio: 'Interested in full-stack development and cloud computing'
  }
]

async function seedUsers() {
  console.log('🌱 Starting user seeding process...')
  
  for (const userData of users) {
    try {
      console.log(`Creating user: ${userData.displayName} (${userData.email})`)
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      )
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        isActive: true,
        createdAt: new Date(),
        ...(userData.major && { major: userData.major }),
        ...(userData.year && { year: userData.year }),
        ...(userData.bio && { bio: userData.bio }),
        ...(userData.isAdmin && { isAdmin: userData.isAdmin })
      })
      
      console.log(`✅ Created user: ${userData.displayName} (${userData.role})`)
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`)
      } else {
        console.error(`❌ Error creating user ${userData.email}:`, error.message)
      }
    }
  }
  
  console.log('🎉 User seeding completed!')
  console.log('\n📋 Next steps:')
  console.log('1. Login as an admin professor (prof.smith@depauw.edu or prof.jones@depauw.edu)')
  console.log('2. Go to Admin Dashboard to assign TAs to courses')
  console.log('3. Create time slots for your courses')
  console.log('4. TAs can then select their available hours')
  console.log('5. Students can book office hours')
}

// Run the seeding function
seedUsers().catch(console.error)
