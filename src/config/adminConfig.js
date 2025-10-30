// Admin professors configuration
// Note: Course assignments are now managed through the admin dashboard interface
export const ADMIN_PROFESSORS = {
  'samicheema_2026@depauw.edu': {
    // Courses are now managed dynamically through the admin dashboard
    // No hardcoded course configurations
  }
}


// Helper function to check if user is an admin professor
export const isAdminProfessor = (email) => {
  return email && ADMIN_PROFESSORS.hasOwnProperty(email)
}

