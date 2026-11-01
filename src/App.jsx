import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import logoImage from './logo-1-1.png?inline';
import signatureImage from './logo-3-1.png?inline';

const initialForm = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  college: '',
  university: '',
  offerDate: '',
  joiningDate: '',
  designation: '',
  duration: '1 Month',
  workingDays: 'Monday to Thursday',
  workingHours: '11 AM - 7 PM',
  stipendType: '',
  stipendAmount: '',
  email: '',
  phone: '',
};

const fieldLabels = {
  firstName: 'First Name',
  lastName: 'Last Name',
  dateOfBirth: 'Date of Birth',
  college: 'College',
  university: 'University',
  offerDate: 'Offer Letter Date',
  joiningDate: 'Date of Joining',
  designation: 'Designation',
  workingDays: 'Working Days',
  workingHours: 'Working Hours',
  stipendType: 'Stipend Type',
  stipendAmount: 'Stipend Amount',
  email: 'Email',
  phone: 'Phone Number',
};

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function displayDate(value) {
  return parseDate(value)?.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) ?? value;
}

function ordinalDate(value) {
  const date = parseDate(value);
  if (!date) return value;
  const day = date.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st'
    : day % 10 === 2 && day !== 12 ? 'nd'
      : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return `${day}${suffix} ${date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
}

function validateForm(form) {
  const errors = {};
  const requiredText = ['firstName', 'lastName', 'college', 'university', 'designation', 'duration'];

  requiredText.forEach((field) => {
    if (!form[field].trim()) errors[field] = `${fieldLabels[field]} is required.`;
  });

  const dateOfBirth = parseDate(form.dateOfBirth);
  const offerDate = parseDate(form.offerDate);
  const joiningDate = parseDate(form.joiningDate);
  if (!dateOfBirth) errors.dateOfBirth = 'Enter a valid date of birth.';
  if (!offerDate) errors.offerDate = 'Enter a valid offer letter date.';
  if (!joiningDate) errors.joiningDate = 'Enter a valid date of joining.';
  if (offerDate && joiningDate && joiningDate < offerDate) {
    errors.joiningDate = 'Date of joining must be on or after the offer letter date.';
  }

  if (!['Monday to Thursday', 'Monday to Friday', 'Monday to Saturday'].includes(form.workingDays)) {
    errors.workingDays = 'Select valid working days.';
  }
  if (!['11 AM - 7 PM', '10 AM - 7 PM', '9 AM - 6 PM'].includes(form.workingHours)) {
    errors.workingHours = 'Select valid working hours.';
  }
  if (!['Free', 'Paid'].includes(form.stipendType)) errors.stipendType = 'Select a stipend type.';
  if (form.stipendType === 'Paid' && (!form.stipendAmount || Number(form.stipendAmount) <= 0)) {
    errors.stipendAmount = 'Enter a stipend amount greater than zero.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  const phoneDigits = form.phone.replace(/\D/g, '');
  if (!/^(?:91)?[6-9]\d{9}$/.test(phoneDigits)) {
    errors.phone = 'Enter a valid Indian phone number, with or without +91.';
  }

  return errors;
}

function sanitizeFilename(value) {
  return value.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Employee';
}

function addWrappedText(pdf, text, x, y, maxWidth, lineHeight = 4.8) {
  const lines = pdf.splitTextToSize(text, maxWidth);
  lines.forEach((line, index) => pdf.text(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

async function assetToDataUrl(assetUrl) {
  if (assetUrl.startsWith('data:')) return assetUrl;
  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`Could not load PDF asset (${response.status}).`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read PDF image asset.'));
    reader.readAsDataURL(blob);
  });
}

async function createOfferPdf(form) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const [logoDataUrl, signatureDataUrl] = await Promise.all([
    assetToDataUrl(logoImage),
    assetToDataUrl(signatureImage),
  ]);
  const left = 30.5;
  const contentWidth = 149;
  const internName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
  const nameUpper = internName.toUpperCase();
  const joiningDate = ordinalDate(form.joiningDate);
  const offerDate = ordinalDate(form.offerDate);
  const institutions = [form.college.trim(), form.university.trim()]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(', ');
  const universityLine = `${institutions}, Bangalore, India`;

  const setup = () => {
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
  };
  const text = (value, x, y, options) => pdf.text(value, x, y, options);
  const paragraph = (value, y, gap = 4.3) => addWrappedText(pdf, value, left, y, contentWidth, gap);
  const startNewPage = () => {
    pdf.addPage();
    setup();
    return 30;
  };
  const writeClause = (value, currentY) => {
    const lineHeight = 4.3;
    const lineCount = pdf.splitTextToSize(value, contentWidth).length;
    const requiredHeight = lineCount * lineHeight + 4.5;
    const nextY = currentY + requiredHeight > 278 ? startNewPage() : currentY;
    return paragraph(value, nextY, lineHeight) + 4.5;
  };
  const label = (value, y) => {
    pdf.setFont('helvetica', 'bold');
    text(value, left, y);
    pdf.setFont('helvetica', 'normal');
  };

  setup();
  pdf.addImage(logoDataUrl, 'PNG', 175.5, 11.5, 15, 15);
  pdf.setTextColor(30, 75, 96);
  pdf.setFontSize(15);
  text('INTERNSHIP OFFER LETTER', 105, 30, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  label('GENEUS SOLUTIONS', 38);
  text('S104,Sarjapur Road, Bangalore', left, 42.5);
  text('support@geneussolutions.in', left, 47);
  text(`Date: ${offerDate}`, left, 57);
  label('To,', 69);
  label(nameUpper, 73.5);
  text(universityLine, left, 78);
  text(`Date of Birth: ${ordinalDate(form.dateOfBirth)}`, left, 82.5);
  text(`Email: ${form.email.trim()}`, left, 87);
  text(`Subject: Offer Letter for ${form.designation.trim()}`, left, 97);
  text(`Dear ${internName},`, left, 108);
  let y = paragraph(
    `We are delighted & excited to welcome you to GENEUS SOLUTIONS as a ${form.designation.trim()}. At GENEUS SOLUTIONS, we believe that our team is our biggest strength, and we take pride in hiring ONLY the best and the brightest. We are confident that you would play a significant role in the overall success of the venture and wish you the most enjoyable, packed and truly meaningful experience with GENEUS SOLUTIONS.`,
    119,
  );
  y += 4;
  y = paragraph('Your appointment will be governed by the terms and conditions presented in the Annexure A.', y);
  y += 7;
  y = paragraph('We look forward to you joining us. Please do not hesitate to reach us for any information you may need. Also, please sign the duplicate of this offer as your acceptance and forward the same to us.', y);
  y += 8;
  label('Annexure A', y);
  y += 8;
  y = paragraph('You shall be governed by the following terms and conditions of service during your internship with GENEUS SOLUTIONS, and those may be amended from time to time.', y);
  y += 2;
  const clauses = [
    `1. Your date of joining is ${joiningDate}. During this time you are expected to devote your time and You are being hired as a ${form.designation.trim()}. As an Intern you would be responsible for tasks and responsibilities assigned by the Mentor.`,
    '2. Complete tasks assigned by the mentor in a timely manner. Regularly update the mentor about any technical difficulties. Request new tasks from the mentor upon completion of previous ones.',
    `3. Working Hour : Full-Time: 4 days a week (${form.workingDays}), ${form.workingHours}`,
    '4. Collaborate with the tech lead to address technical challenges. Whenever there is meeting as scheduled by the mentor, attend video call meetings',
    `5. Duration: This engagement is valid for ${form.duration.toLowerCase()} and may be extended based on project performance, and mutual agreement.`,
    '6. Documentation: Document the entire development process for future reference.',
    '7. Absence and Termination Policy: If you are absent without informing your mentor for 3 consecutive days, it will be considered a breach of agreement. In such cases, your stipend will be forfeited, and your experience certificate will become void. Additionally, the job will be terminated.',
    '8. You will be working at office and remotely in hybrid mode for the duration of the job. There will be catch ups scheduled with your mentor to discuss work progress and overall experience at regular intervals.',
    '9. All the work that you will produce at or in relation to GENEUS SOLUTIONS will be the intellectual property of GENEUS SOLUTIONS. You are not allowed to store, copy, sell, share, and distribute it to a third party under any circumstances. Similarly, you are expected to refrain from talking about your work in public domains (both online such as blogging, social networking site and offline among your friends, college etc.) without prior discussion and approval with your mentor.',
    '10. We take data privacy and security very seriously and to maintain confidentiality of any students, customers, clients, and companies data and contact details that you may get access to during your job will be your responsibility. GENEUS SOLUTIONS operates on zero tolerance principle with regard to any breach of data security guidelines. At the completion of the job you are expected to hand over all GENEUS SOLUTIONS work/data stored on your Personal Computer to your mentor and delete the same from your machine.',
    '11. During the appointment period you shall not engage yourselves directly or indirectly or in any capacity in any other organization. In the event of breach of this condition, this appointment is liable to be terminated forthwith by the company. In addition, you shall be liable to pay liquidated damages to the Company of an extent estimated by the Company.',
    '12. Under normal circumstances either the company or you may terminate this association by providing a notice of 10 days without assigning any reason. However, the company may terminate this agreement forthwith under situations of in-disciplinary behaviors.',
    '13. You are expected to conduct yourself with utmost professionalism in dealing with your mentor, team members, colleagues, clients and customers and treat everyone with due respect.',
    '14. GENEUS SOLUTIONS is a startup and we love people who like to go beyond the normal call of the duty and can think out of the box. Surprise us with your passion, intelligence, creativity and hardwork - and expect appreciation & rewards to follow.',
    '15. Expect constant and continuous objective feedback from your mentor and other team members and we encourage you to ask for and provide feedback at every possible opportunity. It is your right to receive and give feedback - this is the ONLY way we all can continuously push ourselves to do better.',
    '16. Have fun at what you do and do the right thing - both the principles are core of what GENEUS SOLUTIONS stands for and we expect you to imbibe them in your day-to-day actions and continuously challenge us if we are falling short of expectations on either of them.',
  ];
  clauses.forEach((clause) => {
    y = writeClause(clause, y);
  });

  y = writeClause('I have negotiated, agreed, read and understood all the terms and conditions of this Internship letter as well as Annexure hereto and affix my signature in complete acceptance of the terms of the letter.', y);
  if (y + 40 > 278) y = startNewPage();
  label('Acceptance:', y);
  y += 6;
  y = paragraph('Please acknowledge your acceptance of this offer by signing below and sharing a scanned or digitally signed copy.', y);
  y += 4;
  label('For Geneus Solutions', y);
  y += 5;
  pdf.addImage(signatureDataUrl, 'PNG', left, y, 22, 17);
  y += 22;
  label('Meenaxi Sail', y);
  text('Founder & Authorized Signatory', left, y + 5);
  text(`Date: ${offerDate}`, left, y + 10);

  const filename = `${sanitizeFilename(form.firstName)}_${sanitizeFilename(form.lastName)}_Offer_Letter.pdf`;
  pdf.save(filename);
}

function Field({ name, label, required = true, error, children }) {
  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      <label htmlFor={name}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <p className="error-message" id={`${name}-error`}>{error}</p>}
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isGenerating, setIsGenerating] = useState(false);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setStatus({ type: '', message: '' });
  };

  const handleStipendType = (value) => {
    setForm((current) => ({ ...current, stipendType: value, stipendAmount: value === 'Free' ? '' : current.stipendAmount }));
    setErrors((current) => ({ ...current, stipendType: undefined, stipendAmount: undefined }));
    setStatus({ type: '', message: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isGenerating) return;
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setStatus({ type: 'error', message: 'Please correct the highlighted fields before downloading.' });
      return;
    }

    setIsGenerating(true);
    setStatus({ type: '', message: '' });
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      await createOfferPdf(form);
      setStatus({ type: 'success', message: 'Offer letter generated and downloaded successfully.' });
    } catch (error) {
      console.error('Offer letter PDF generation failed.', error);
      setStatus({ type: 'error', message: 'The offer letter could not be generated. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const describedBy = (name) => errors[name] ? `${name}-error` : undefined;

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="eyebrow">DOCUMENT STUDIO</div>
        <h1>Employee Offer Letter Generator</h1>
        <p>Enter the employee details below to create and download a polished offer letter as a PDF.</p>
      </section>

      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <div className="form-heading">
          <div>
            <h2>Employee details</h2>
            <p>Fields marked with <span aria-hidden="true">*</span> are required.</p>
          </div>
          <span className="step-badge">01 / 01</span>
        </div>

        <div className="form-grid">
          <Field name="firstName" label="First Name" error={errors.firstName}>
            <input id="firstName" type="text" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} placeholder="Enter first name" aria-invalid={Boolean(errors.firstName)} aria-describedby={describedBy('firstName')} />
          </Field>
          <Field name="lastName" label="Last Name" error={errors.lastName}>
            <input id="lastName" type="text" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} placeholder="Enter last name" aria-invalid={Boolean(errors.lastName)} aria-describedby={describedBy('lastName')} />
          </Field>
          <Field name="dateOfBirth" label="Date of Birth" error={errors.dateOfBirth}>
            <input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} aria-invalid={Boolean(errors.dateOfBirth)} aria-describedby={describedBy('dateOfBirth')} />
          </Field>
          <Field name="college" label="College" error={errors.college}>
            <input id="college" type="text" value={form.college} onChange={(e) => updateField('college', e.target.value)} placeholder="Enter college name" aria-invalid={Boolean(errors.college)} aria-describedby={describedBy('college')} />
          </Field>
          <Field name="university" label="University" error={errors.university}>
            <input id="university" type="text" value={form.university} onChange={(e) => updateField('university', e.target.value)} placeholder="Enter university name" aria-invalid={Boolean(errors.university)} aria-describedby={describedBy('university')} />
          </Field>
          <Field name="offerDate" label="Offer Letter Date" error={errors.offerDate}>
            <input id="offerDate" type="date" value={form.offerDate} onChange={(e) => updateField('offerDate', e.target.value)} aria-invalid={Boolean(errors.offerDate)} aria-describedby={describedBy('offerDate')} />
          </Field>
          <Field name="joiningDate" label="Date of Joining" error={errors.joiningDate}>
            <input id="joiningDate" type="date" value={form.joiningDate} onChange={(e) => updateField('joiningDate', e.target.value)} aria-invalid={Boolean(errors.joiningDate)} aria-describedby={describedBy('joiningDate')} />
          </Field>
          <Field name="designation" label="Designation" error={errors.designation}>
            <input id="designation" type="text" value={form.designation} onChange={(e) => updateField('designation', e.target.value)} placeholder="e.g. Software Engineering Intern" aria-invalid={Boolean(errors.designation)} aria-describedby={describedBy('designation')} />
          </Field>
          <Field name="duration" label="Duration" error={errors.duration}>
            <input id="duration" type="text" value={form.duration} onChange={(e) => updateField('duration', e.target.value)} placeholder="e.g. 1 Month" aria-invalid={Boolean(errors.duration)} aria-describedby={describedBy('duration')} />
          </Field>
          <Field name="workingDays" label="Working Days" error={errors.workingDays}>
            <select id="workingDays" value={form.workingDays} onChange={(e) => updateField('workingDays', e.target.value)} aria-invalid={Boolean(errors.workingDays)} aria-describedby={describedBy('workingDays')}>
              <option value="Monday to Thursday">Monday to Thursday</option>
              <option value="Monday to Friday">Monday to Friday</option>
              <option value="Monday to Saturday">Monday to Saturday</option>
            </select>
          </Field>
          <Field name="workingHours" label="Working Hours" error={errors.workingHours}>
            <select id="workingHours" value={form.workingHours} onChange={(e) => updateField('workingHours', e.target.value)} aria-invalid={Boolean(errors.workingHours)} aria-describedby={describedBy('workingHours')}>
              <option value="11 AM - 7 PM">11 AM - 7 PM</option>
              <option value="10 AM - 7 PM">10 AM - 7 PM</option>
              <option value="9 AM - 6 PM">9 AM - 6 PM</option>
            </select>
          </Field>
          <div className="section-label">Compensation</div>
          <Field name="stipendType" label="Stipend Type" error={errors.stipendType}>
            <select id="stipendType" value={form.stipendType} onChange={(e) => handleStipendType(e.target.value)} aria-invalid={Boolean(errors.stipendType)} aria-describedby={describedBy('stipendType')}>
              <option value="">Select stipend type</option>
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
            </select>
          </Field>
          {form.stipendType === 'Paid' && (
            <Field name="stipendAmount" label="Stipend Amount" error={errors.stipendAmount}>
              <input id="stipendAmount" type="number" min="0.01" step="0.01" value={form.stipendAmount} onChange={(e) => updateField('stipendAmount', e.target.value)} placeholder="Enter amount in INR" aria-invalid={Boolean(errors.stipendAmount)} aria-describedby={describedBy('stipendAmount')} />
            </Field>
          )}
          <Field name="email" label="Email" error={errors.email}>
            <input id="email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="name@example.com" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')} />
          </Field>
          <Field name="phone" label="Phone Number" error={errors.phone}>
            <input id="phone" type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+91 98765 43210" aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy('phone')} />
          </Field>
        </div>

        <div className="form-footer">
          <div className="status-area" role="status" aria-live="polite">
            {status.message && <p className={`status ${status.type}`}>{status.message}</p>}
          </div>
          <button type="submit" className="primary-button" disabled={isGenerating}>
            {isGenerating ? 'Generating PDF…' : 'Download Offer Letter'}
            {!isGenerating && <span aria-hidden="true">→</span>}
          </button>
        </div>
      </form>
      <p className="privacy-note">Your details stay in this browser and are used only to generate your document.</p>
    </main>
  );
}
