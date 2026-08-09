// ============================================================
// Modelos de Mongoose - Registro centralizado
// ============================================================
// Este archivo importa todos los modelos para que Mongoose los
// registre al iniciar la aplicación. Esto es crítico para evitar
// el error "MissingSchemaError: Schema hasn't been registered"
// en entornos serverless (Cloud Run) con cold starts.
// ============================================================

import './User'
import './Person'
import './Family'
import './Marriage'
import './Ministry'
import './MinistryRole'
import './MinistryMembership'
import './Invitation'
import './Event'
import './EventAssignment'
import './EventEnrollment'
import './EventCheckIn'
import './Course'
import './CourseSession'
import './CourseEnrollment'
import './CourseAttendance'
import './Relationship'
import './Child'
import './Caregiver'
import './WelcomeCard'
