# Clinic Appointment Platform — Beauty & Aesthetic Clinic

## Objective

The main goal of this MVP is to build a modern, simple, and functional appointment & live queue platform for a single **Beauty & Aesthetic Clinic** with multiple aesthetic and dermatology doctors. The admin manages aesthetic doctors, practice schedules, and treatment services, while patients can browse doctors by aesthetic specialization, book appointments/treatments, upload payment proofs, obtain digital barcode tickets, and check-in on-site.

---

## Core Features

### Feature 1

#### 1. Doctor Discovery, Details, and Schedule Management (4 point)

- **Landing Page:** Display an aesthetic clinic profile, featured aesthetic treatments, and a list of aesthetic & dermatology doctors along with their specializations (*Dermatology Sp.D.V.E, Aesthetic Medicine Dipl. AAAM, Plastic Surgery Sp.B.P.R.E, Laser & Skincare Specialist, Trichology/Hair Care*).
- **Doctor Browsing:** Patients can browse doctors, filter by aesthetic specialization, filter by consultation fee, filter by practice schedule, and view each doctor's clinical profile (experience, practice schedule, consultation fee, bio).
- **Search Bar:** Implement a search bar with debounce functionality.
- **Responsiveness:** Responsiveness is a must.
- **Doctor Creation:** Admin can add doctors with details such as name, specialization, consultation fee, practice schedule, patient quota, photo, and bio.
- **Practice Session and Patient Quota:** For each practice session, admin sets the start time, end time, and the maximum number of patients that doctor can accept (e.g. Doctor practices from 09:00-13:00 and only accepts a maximum of 12 patients for that session).

#### 2. Appointment Booking and Transaction (4 point)

- **Booking:** Patients can select a doctor and an available practice session (date), then create an appointment transaction.
- **Quota Availability:** The system displays the remaining patient quota for each practice session and prevents booking once the session's quota is full.
- **Transaction Statuses:** There are six statuses: waiting for payment, waiting for admin confirmation, done, rejected, expired, and canceled.
- **Payment Proof:** After selecting a slot and checking out, a 30 minutes countdown is shown for uploading the payment proof (supports Base64 compressed images and direct uploads).
- **Automatic Status Changes:**
  - Transactions expire if no payment proof is uploaded within 30 minutes.
  - If the admin doesn't accept/reject before the practice session starts, the transaction is automatically canceled.
- **QR Code Generation:** Once a transaction is accepted by admin (status done), the system generates a unique QR code for that appointment, viewable by the patient in their appointment history/detail page.
- **Quota Restoration:** If a transaction is canceled, rejected, or expired, the patient's booked quota is automatically released and made available for other patients to book, and the remaining queue numbers are adjusted accordingly.
- **Currency:** Uses only IDR for every price of items.

#### 3. Appointment History and Ratings (2 point)

- **Appointment History:** Patients can view their past appointments, including doctor name, practice session date, queue number, and consultation fee paid.
- **Appointment Code & Copy Button:** Displays reservation code with one-click copy to clipboard.
- **Barcode View:** If confirmed, patients can click "Lihat Barcode Antrean" to show the QR code directly to clinic staff.
- **Ratings:** Patients can leave a rating and review for a doctor only after the appointment has been completed (checked in at clinic).

### Feature 2
#### 1. Authentication and Authorization (2 point)

- **Account Creation:** Patients must create an account to book an appointment.
- **Roles:** There are two roles: patient and admin (the clinic's manager account).
- **Role-Based Access:** Protect pages based on user roles (protected route).
- **Profile:** Patients and admin can edit their profiles, including updating their profile picture, changing their password, and resetting their password if forgotten.

#### 2. QR Check-In and Live Queue Number (4 point)

- **On-Site Check-In:** On the day of the practice session, clinic staff scans the patient's QR code (via camera scanner or floating scanner button) to mark the appointment as checked-in, confirming the patient has arrived.
- **Check-In Window:** QR check-in is only valid on the appointment's practice session date; the system rejects check-in attempts outside that window.
- **Queue Number:** Once check-in is successful, the system automatically assigns a queue number to the appointment, based on the order it was checked in within that practice session.
- **Live Queue Display:** A public-facing queue display page shows the current serving number and next-up numbers for each doctor's ongoing practice session, updated in real time.
- **Call Next Patient:** Admin/doctor's assistant can advance the current serving number for a practice session; only checked-in patients can be called.
- **No-Show Handling:** If a patient has not checked in by the time their booking queue number is called or the session ends, admin can mark the appointment as a no-show.

#### 3. Admin Dashboard (4 point)

- **Dashboard Access:** Admin can view and manage all doctors (edit doctor data, practice schedule, etc.), appointments, and basic statistics.
- **Statistics Visualization:** Display appointment data in graphical visualizations and reports by year, month, and day, including per-doctor statistics.
- **Transaction Management:** Admin can accept, reject, and view patients' payment proofs in full resolution.
- **Edit & Reschedule:** Admin can update appointment details or reassign doctors/sessions when necessary.
- **Appointment List:** Show the list of appointments for each doctor's practice session, including patient name, queue number, and status.

---

## Notes

- Protected route should be implemented.
- Responsiveness is a must.
- Debounce should be implemented on the search bar.
- Confirmation popup dialog should be implemented when modifying data.
- Unit tests should be created for each flow.
- Handle empty state when there are no items in the filter or search results.
- SQL transaction should be implemented on modify actions involving more than one action.
- Data used should be relevant to the project theme (Aesthetic & Dermatology Clinic).

---

## References

- https://www.halodoc.com/
- https://www.alodokter.com/
- https://www.klikdokter.com/
- https://www.practo.com/
- https://www.zocdoc.com/
