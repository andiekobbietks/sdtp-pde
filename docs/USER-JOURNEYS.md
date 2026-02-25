# User Journeys

## Overview

LAMPForge serves three primary user personas. This document maps their journeys through the platform with Mermaid diagrams.

---

## Persona 1: The A-Level Student

### Profile
- **Age**: 16-18
- **Goal**: Complete WJEC Unit 4 coursework (database-driven web application)
- **Pain**: Infrastructure setup, SQL syntax, evidence collection
- **Success**: Achieve target grade (E → A*) with a working application and complete SDLC evidence

### Journey: First-Time Use

```mermaid
journey
    title Student's First LAMPForge Session
    section Discovery
      Visit LAMPForge URL: 5: Student
      Read hero text: 4: Student
      Explore template gallery: 5: Student
    section Configuration
      Select scaffold level: 4: Student
      Choose Exploratory for safety: 3: Student
      Read level description: 4: Student
    section Intent Declaration
      Click Library System template: 5: Student
      Review pre-filled intent: 4: Student
      Click Forge It: 5: Student
      Watch forge animation: 5: Student
    section PDE Exploration
      See CLI banner animation: 5: Student
      Notice canvas with entities: 4: Student
      Browse generated SQL: 4: Student
      Edit PHP file in editor: 3: Student
      Run SQL in workbench: 4: Student
    section Evidence
      Check Evidence panel: 4: Student
      See auto-captured timeline: 5: Student
      Export for portfolio: 4: Student
```

### Journey: Progression Through Scaffold Levels

```mermaid
graph TD
    S1[Week 1-2<br/>Exploratory Level] --> S2[Week 3-4<br/>Competent Level]
    S2 --> S3[Week 5-6<br/>Exemplary Level]
    S3 --> S4[Week 7+<br/>RAD 2.0 Optional]

    S1 -->|"Learns"| L1["1NF tables<br/>Basic SELECT/INSERT<br/>Plain HTML forms"]
    S2 -->|"Learns"| L2["2NF normalisation<br/>Foreign keys<br/>Bootstrap UI"]
    S3 -->|"Learns"| L3["3NF normalisation<br/>PDO prepared statements<br/>CSRF protection"]
    S4 -->|"Learns"| L4["Soft deletes<br/>Pagination + search<br/>Vite HMR workflow"]
```

---

## Persona 2: The Teacher

### Profile
- **Role**: A-Level Digital Technology teacher
- **Goal**: Deliver Unit 4 effectively, help students achieve target grades
- **Pain**: Supporting 20+ students with different XAMPP configurations
- **Success**: All students submit working applications with complete evidence

### Journey: Classroom Deployment

```mermaid
journey
    title Teacher's LAMPForge Classroom Session
    section Preparation
      Share LAMPForge URL with class: 5: Teacher
      No installation needed: 5: Teacher
      Prepare intent examples: 4: Teacher
    section Lesson Delivery
      Demonstrate Exploratory level: 5: Teacher
      Show 1NF vs 3NF output: 5: Teacher
      Students follow along: 4: Student
      Zero config issues: 5: Teacher
    section Differentiation
      Set Exploratory for weaker students: 4: Teacher
      Set Exemplary for stronger students: 5: Teacher
      Same tool different output: 5: Teacher
    section Assessment
      Review Evidence logs: 5: Teacher
      Students export SDLC timelines: 4: Student
      Compare generated vs hand-written code: 4: Teacher
```

### Teacher's Decision Matrix

```mermaid
graph TD
    T[Teacher assesses student] --> Q1{Student's target grade?}
    Q1 -->|"E/D"| EX[Set to Exploratory<br/>Focus on basic SQL + forms]
    Q1 -->|"C/B"| CO[Set to Competent<br/>Introduce FKs + Bootstrap]
    Q1 -->|"A/A*"| EM[Set to Exemplary<br/>Full 3NF + security]
    Q1 -->|"Beyond syllabus"| RAD[Set to RAD 2.0<br/>Production patterns]
    
    EX --> R1[Student sees flat tables<br/>Simple PHP<br/>Plain HTML]
    CO --> R2[Student sees 2NF<br/>Escaped queries<br/>Bootstrap forms]
    EM --> R3[Student sees 3NF<br/>PDO + CSRF<br/>Full validation]
    RAD --> R4[Student sees 3NF+<br/>Soft deletes<br/>Vite HMR preview]
```

---

## Persona 3: The RAEng Panel Evaluator

### Profile
- **Role**: Engineering education assessor
- **Goal**: Evaluate whether the tool demonstrates engineering habits of mind
- **Pain**: Assessing "is this just a wrapper around ChatGPT?"
- **Success**: Evidence of systematic engineering approach, IP ownership, pedagogical depth

### Journey: Platform Evaluation

```mermaid
journey
    title RAEng Panel Evaluation of LAMPForge
    section First Impression
      Read project overview: 4: Evaluator
      Note 5-Family Taxonomy: 5: Evaluator
      Appreciate scaffold levels: 5: Evaluator
    section Technical Depth
      Review Zod schema validation: 5: Evaluator
      Examine AI pipeline architecture: 5: Evaluator
      Note local-first design: 5: Evaluator
    section Engineering Habits
      Systems thinking - taxonomy: 5: Evaluator
      Adapting - fallback strategies: 5: Evaluator
      Improving - scaffold progression: 5: Evaluator
    section IP Ownership
      Review CI/CD pipeline: 5: Evaluator
      Note sovereign Code-OSS fork: 5: Evaluator
      Assess infrastructure autonomy: 5: Evaluator
    section Verdict
      Score against rubric: 4: Evaluator
      Recommend for recognition: 5: Evaluator
```

### RAEng Engineering Habits of Mind Mapping

```mermaid
mindmap
  root((LAMPForge<br/>Engineering Habits))
    Systems Thinking
      5-Family Taxonomy
      Architecture Canvas
      Component Relationships
    Problem Finding
      Intent Declaration
      Natural Language Input
      Constraint Identification
    Creative Problem Solving
      AI Scaffolding
      Multiple Valid Schemas
      Scaffold Level Adaptation
    Visualising
      React Flow Canvas
      Mermaid Diagrams
      Colour-Coded Taxonomy
    Improving
      Exploratory → RAD 2.0
      Evidence Timeline
      Iterative Schema Refinement
    Adapting
      Local-First AI
      Code-OSS + StackBlitz Fallback
      Offline Capability
```

---

## Cross-Persona Interaction Flow

```mermaid
sequenceDiagram
    participant T as Teacher
    participant S as Student
    participant LF as LAMPForge
    participant E as Evidence Log
    participant R as RAEng Panel
    
    T->>S: Assign Unit 4 project
    T->>S: Share LAMPForge URL
    T->>LF: Set scaffold level guidance
    
    S->>LF: Declare intent
    LF->>LF: Generate blueprint
    LF->>S: Present PDE with code
    
    loop Development Cycle
        S->>LF: Edit code / run SQL
        LF->>E: Auto-capture evidence
        S->>LF: Refine schema on canvas
        LF->>E: Log modifications
    end
    
    S->>E: Export SDLC evidence
    S->>T: Submit coursework
    T->>T: Assess against WJEC criteria
    
    T->>R: Present platform for evaluation
    R->>R: Assess engineering habits
    R->>T: Provide feedback
```

---

*This document is part of the LAMPForge doc-as-code suite. See [README.md](../README.md) for the full documentation index.*
