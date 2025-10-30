#!/usr/bin/env node

/**
 * Extract DePauw Computer Science Course Data
 * 
 * This script extracts course data from the provided web search results
 * and creates structured JSON data for import into Firebase.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Course data extracted from the web search results
const courseData = [
  {
    courseCode: "CSC 120",
    title: "Computer Science for All",
    description: "Computers (in their various kinds and sizes) appear in our hands, cars, and other parts of our daily lives. They are essential tools in business, healthcare, education, and industry. Computers play a crucial research role in technical fields, humanities, and social sciences. This course serves students who want to learn elementary principles of computer science and some basic data analysis skills using the popular computer language Python.",
    prerequisites: [],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "100"
  },
  {
    courseCode: "CSC 121",
    title: "Computer Science I",
    description: "This is an introductory course in which problem solving and algorithm development are studied by considering computer science topics, such as computer graphics, graphical user interfaces, modeling and simulation, artificial intelligence and information management systems. A brief introduction to content in the remaining core courses, such as object-oriented concepts, stacks, and queues. Interesting and relevant programming assignments related to these topics are written in a high-level programming language that supports objects. Additional assignments utilize writing and data analysis to reinforce central course concepts and to address related areas of computing, such as ethics, history and the meaning of intelligence.",
    prerequisites: [],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "100"
  },
  {
    courseCode: "CSC 125",
    title: "Principles of Software Development",
    description: "A study of fundamental techniques and tools for managing software development projects, together with relevant professional and ethical issues. Topics include methodologies such as UML diagrams for software specification and design, documentation standards, and tools for testing, code management, analysis, and debugging. Object oriented programming techniques such as inheritance and polymorphism are emphasized. Students will develop skills in individual and team software development through extensive practice designing and implementing object oriented software systems. In addition, students gain experience reading, documenting, presenting and critiquing such systems.",
    prerequisites: ["CSC 121"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "100"
  },
  {
    courseCode: "CSC 184",
    title: "On-Campus Extended Studies Course",
    description: "An on-campus course offered during the Winter or May term. May be offered for .5 course credits or as a co-curricular (0 credit). Counts toward satisfying the Extended Studies requirement.",
    prerequisites: [],
    credits: "Variable",
    distributionArea: "Extended Studies",
    courseLevel: "100"
  },
  {
    courseCode: "CSC 185",
    title: "Extended Studies Independent Project",
    description: "Student-initiated independent project under faculty guidance. Offered as a co-curricular (0 credit) Extended Studies experience.",
    prerequisites: [],
    credits: "0 course",
    distributionArea: "Extended Studies",
    courseLevel: "100"
  },
  {
    courseCode: "CSC 197",
    title: "First-Year Seminar",
    description: "A seminar focused on a theme related to the study of computer science.",
    prerequisites: [],
    credits: "1 course",
    distributionArea: "First-Year Seminar",
    courseLevel: "100"
  },
  {
    courseCode: "CSC 231",
    title: "Computer Systems",
    description: "This is an introduction to the study of computer hardware and its relationship to software. Topics include information representation, the architecture of the central processing unit, memory organization and hierarchy, assembly language, and machine-level representation of programs, interactions, and relationships among system components (hardware, operating systems, compilers, network environments), and the impact of architectural decisions on performance.",
    prerequisites: ["CSC 125"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "200"
  },
  {
    courseCode: "CSC 235",
    title: "Data Structures",
    description: "This course includes programming topics such as sorting and searching, sets, recursion, and dynamic data types. Additional concepts involve data type abstraction and implementation developed through studying structures such as lists, stacks, queues, hash tables, and binary search trees. The course emphasizes the object-oriented implementation of these structures. Students learn tools for algorithm analysis and explore the use of standard libraries. The concept of tradeoffs (i.e., time vs. space, iteration vs. recursion, static vs. dynamic) recurs as a theme throughout the course.",
    prerequisites: ["CSC 125", "MATH 123"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "200"
  },
  {
    courseCode: "CSC 236",
    title: "Algorithmic Foundations of Computation",
    description: "This course explores advanced data structures and the theoretical foundations of computation at various levels of abstraction. Specific topics include graph theory and related algorithms; analysis of algorithms; dynamic programming; functional programming with an emphasis on recursion and recurrences; and the description of languages using formalisms such as regular expressions, finite state machines, and context-free grammars.",
    prerequisites: ["CSC 235"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "200"
  },
  {
    courseCode: "CSC 296",
    title: "Computer Science Topics",
    description: "Topics are chosen from computer science content areas that extend explorations of content in existing courses or allow exploration of content not duplicated in regular course offerings.",
    prerequisites: [],
    credits: "1/4-1/2-1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "200"
  },
  {
    courseCode: "CSC 320",
    title: "Human Computer Interaction",
    description: "This course examines fundamental principles in Human Computer Interaction as seen from the viewpoint of a computer scientist. Topics include user-centered design, expert reviews, usability tests, tradeoffs between interaction devices, alternative input-output methods, including handwriting recognition and associated algorithms, the design of interfaces for users with visual or motor impairments, construction of appropriate error messages and implementation of graphical user interfaces (GUIs).",
    prerequisites: ["CSC 125"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "300"
  },
  {
    courseCode: "CSC 322",
    title: "Computer Networking",
    description: "This course examines the core concepts and fundamental principles of computer networks and the services built on top of them. Topics covered include protocol organization, circuit-switch and packet-switch networks, routing, flow control, congestion control, reliability, security, quality-of-service and Internet protocols (TCP/IP).",
    prerequisites: ["CSC 231", "CSC 235"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "300"
  },
  {
    courseCode: "CSC 370",
    title: "Data Mining",
    description: "Data mining is the effort to reach useful conclusions from data by building interpretive and predictive computational models. This course prepares students to do this through hands-on exploration of data preparation, and model development, tuning, and validation. This is done in the context of various algorithms such as gradient-descent, ensemble methods, and linear regression. Coursework includes multiple significant programming projects and a large final project.",
    prerequisites: ["CSC 236"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "300"
  },
  {
    courseCode: "CSC 380",
    title: "Machine Learning",
    description: "This course will briefly cover topics in data pre-processing, regression, classification, clustering, neural networks, ensemble methods, and deep learning. We will learn the fundamental concepts behind several machine learning algorithms without going deeply into the mathematics. We will focus on gaining practical experience applying machine learning to a range of real-world problems.",
    prerequisites: ["CSC 236", "MATH 141"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "300"
  },
  {
    courseCode: "CSC 396",
    title: "Computer Science Topics",
    description: "Topics are chosen from computer science content areas that extend explorations of content in existing courses or allow exploration of content not duplicated in regular course offerings.",
    prerequisites: [],
    credits: "1/4-1/2-1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "300"
  },
  {
    courseCode: "CSC 398",
    title: "Independent Study",
    description: "Directed study in a selected topic in computer science. Participation by arrangement with a faculty member. Consult with faculty member to determine credit. May be repeated for credit with different topics. No credit from CSC398 will count toward the computer science major.",
    prerequisites: [],
    credits: "1/4-1/2-1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "300"
  },
  {
    courseCode: "CSC 424",
    title: "Programming Languages",
    description: "The topics of this course include a history of programming languages, virtual machines, representation of data types, sequence control, data control, lexical vs. dynamic scoping, sharing, type checking, parameter passing mechanisms, run-time storage management, context-free grammars, language translation systems, semantics and programming paradigms.",
    prerequisites: ["CSC 231", "CSC 236"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "400"
  },
  {
    courseCode: "CSC 426",
    title: "Compilers",
    description: "This course offers the study of theories related to compilers with the goal of implementing a compiler for a simplified variation of a language such as C++. Topics include formal languages, grammars, lexical, syntactic and semantic analysis, code generation and optimization.",
    prerequisites: ["CSC 231", "CSC 236"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "400"
  },
  {
    courseCode: "CSC 428",
    title: "Operating Systems",
    description: "Topics in operating system concepts and design, such as file systems, CPU scheduling, memory management, virtual memory, disk scheduling, deadlocks, concurrent processes, protection and distributed systems are studied in this course. Topics are treated thoroughly in a generic way and also discussed in detail with respect to a specific operating system.",
    prerequisites: ["CSC 231", "CSC 235"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "400"
  },
  {
    courseCode: "CSC 430",
    title: "Computer Security",
    description: "This course examines and discusses computer security, how to protect our computing infrastructure from illegal access, tempering, denial of access, etc. We will first define terms such as security and secure computing, then we'll talk about cryptography including symmetric and public key cryptographic techniques and their applications. Other topics covered include secure software, cyber security, database security, system security and hardware security.",
    prerequisites: ["CSC 231", "CSC 235"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "400"
  },
  {
    courseCode: "CSC 440",
    title: "Theory of Computation",
    description: "Various models of formal languages (which provide a basis for compilers) and computation (which defines the kinds of problems that can be solved by a computer) are studied. Topics include regular languages, regular expressions, finite state automata, context-free languages, context-free grammars, push-down automata and Turing machines. The application of these models to several practical problems in computer science is considered. Computational limits are also discussed, using as examples several problems which cannot be solved by any algorithm.",
    prerequisites: ["CSC 236"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "400"
  },
  {
    courseCode: "CSC 480",
    title: "Database and File Systems",
    description: "This course provides an external and an internal view of relational database management systems (DBMSs). The external view consists of database design and implementation. The database query and manipulation language SQL will be studied to the degree that students will be able to become proficient in this language on their own. The internal view involves characteristics of secondary storage devices, methods of organizing information, various file organization and accessing techniques and other topics related to database engine implementation. Programming assignments complement topics discussed in class, including the building of a few key components of a database engine.",
    prerequisites: ["CSC 231", "CSC 235"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "400"
  },
  {
    courseCode: "CSC 496",
    title: "Computer Science Topics",
    description: "Topics are chosen from content areas of computer science that either extend explorations of content in existing courses or allow explorations of content not duplicated in our current course offerings.",
    prerequisites: [],
    credits: "1/4-1/2-1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "400"
  },
  {
    courseCode: "CSC 498",
    title: "Senior Project",
    description: "Students complete a project proposal and a project under the sponsorship of a member of the computer science faculty. Students build on previous course work and/or internship experiences to complete their projects, to produce a project write-up, and to examine ethical issues related to their projects. Periodic progress reports will also be given.",
    prerequisites: ["CSC 231", "CSC 235", "CSC 236"],
    credits: "1 course",
    distributionArea: "Science and Mathematics",
    courseLevel: "400"
  }
];

async function generateCourseData() {
  try {
    console.log('Generating DePauw Computer Science course data...');
    
    // Create data directory if it doesn't exist
    const outputDir = path.join(__dirname, '..', 'src', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Output to JSON file
    const outputPath = path.join(outputDir, 'depauw-courses.json');
    fs.writeFileSync(outputPath, JSON.stringify(courseData, null, 2));
    
    console.log(`Generated ${courseData.length} courses`);
    console.log(`Course data saved to: ${outputPath}`);
    
    // Output summary
    console.log('\n=== COURSE SUMMARY ===');
    courseData.forEach(course => {
      console.log(`${course.courseCode}: ${course.title} (${course.courseLevel} level)`);
    });
    
    return courseData;
    
  } catch (error) {
    console.error('Error generating course data:', error);
    throw error;
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCourseData()
    .then(() => {
      console.log('\n✅ Course data generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Course data generation failed:', error);
      process.exit(1);
    });
}

export { courseData, generateCourseData };

