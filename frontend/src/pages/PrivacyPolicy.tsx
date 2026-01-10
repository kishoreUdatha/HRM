import React from 'react';
import { Link } from 'react-router-dom';
import { HiArrowLeft, HiShieldCheck } from 'react-icons/hi';

const PrivacyPolicy: React.FC = () => {
  const lastUpdated = "January 10, 2025";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <HiArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <HiShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black">Privacy Policy</h1>
              <p className="text-white/80 mt-1">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-12 space-y-8">

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              Welcome to HRZIO ("we," "our," or "us"). We are committed to protecting your privacy and ensuring
              the security of your personal information. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our Human Resource Management (HRM) software-as-a-service
              platform ("Service").
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              By accessing or using our Service, you agree to this Privacy Policy. If you do not agree with the
              terms of this Privacy Policy, please do not access the Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2.1 Personal Information</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              We collect personal information that you voluntarily provide to us when you register for an account,
              use our Service, or contact us. This may include:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Name, email address, phone number, and job title</li>
              <li>Company/organization name and address</li>
              <li>Employee identification numbers and employment details</li>
              <li>Payroll and compensation information</li>
              <li>Attendance records and time tracking data</li>
              <li>Performance reviews and feedback</li>
              <li>Leave and absence records</li>
              <li>Emergency contact information</li>
              <li>Government-issued identification numbers (where required by law)</li>
              <li>Bank account details for payroll processing</li>
              <li>Biometric data (facial recognition for attendance, if enabled)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2.2 Automatically Collected Information</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you access our Service, we automatically collect certain information, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Device information (type, operating system, unique device identifiers)</li>
              <li>IP address and geographic location</li>
              <li>Browser type and version</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>GPS location data (for geo-fenced attendance tracking, if enabled)</li>
            </ul>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>To provide, maintain, and improve our Service</li>
              <li>To process payroll and manage employee compensation</li>
              <li>To track attendance, leaves, and time management</li>
              <li>To facilitate recruitment and onboarding processes</li>
              <li>To manage performance reviews and employee development</li>
              <li>To generate reports and analytics for your organization</li>
              <li>To communicate with you about updates, security alerts, and support</li>
              <li>To ensure compliance with legal and regulatory requirements</li>
              <li>To detect, prevent, and address technical issues and security threats</li>
              <li>To personalize and enhance your experience with our Service</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>With Your Organization:</strong> Data is shared with authorized personnel within your organization as per your configured access controls</li>
              <li><strong>Service Providers:</strong> We may share data with third-party vendors who assist us in providing our Service (e.g., cloud hosting, payment processing)</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or government request</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred</li>
              <li><strong>With Your Consent:</strong> We may share information for other purposes with your explicit consent</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard security measures to protect your personal information, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
              <li>Encryption of data in transit (TLS/SSL) and at rest (AES-256)</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Multi-factor authentication options</li>
              <li>Role-based access controls</li>
              <li>Regular data backups with secure storage</li>
              <li>Employee training on data protection practices</li>
              <li>Incident response procedures</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              While we strive to protect your information, no method of transmission over the Internet or
              electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes outlined
              in this Privacy Policy, unless a longer retention period is required or permitted by law.
              When determining retention periods, we consider:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
              <li>The nature and sensitivity of the data</li>
              <li>Legal and regulatory requirements (e.g., tax records, employment laws)</li>
              <li>Contractual obligations with your organization</li>
              <li>Legitimate business purposes</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              Upon termination of your subscription, we will retain your data for a reasonable period to
              allow for data export, after which it will be securely deleted or anonymized.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Depending on your location, you may have certain rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal information (subject to legal requirements)</li>
              <li><strong>Restriction:</strong> Request limitation of processing of your data</li>
              <li><strong>Portability:</strong> Request transfer of your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing of your personal information</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              To exercise these rights, please contact your organization's HR administrator or reach out to us directly.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. International Data Transfers</h2>
            <p className="text-gray-600 leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence.
              These countries may have different data protection laws. When we transfer data internationally, we
              implement appropriate safeguards such as:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
              <li>Standard Contractual Clauses approved by relevant authorities</li>
              <li>Data processing agreements with our service providers</li>
              <li>Compliance with applicable data protection frameworks</li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies and Tracking Technologies</h2>
            <p className="text-gray-600 leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience. These include:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
              <li><strong>Essential Cookies:</strong> Required for the Service to function properly</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our Service</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              You can manage cookie preferences through your browser settings. Note that disabling certain
              cookies may affect the functionality of our Service.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              Our Service is not intended for individuals under the age of 18. We do not knowingly collect
              personal information from children. If you believe we have collected information from a child,
              please contact us immediately, and we will take steps to delete such information.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes
              by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage
              you to review this Privacy Policy periodically.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
              <p className="text-gray-700"><strong>HRZIO Privacy Team</strong></p>
              <p className="text-gray-600 mt-2">Email: privacy@hrzio.com</p>
              <p className="text-gray-600">Address: [Your Business Address]</p>
              <p className="text-gray-600 mt-4">
                For data protection inquiries, please include "Privacy Request" in the subject line.
              </p>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-gray-500">
            See also: <Link to="/terms" className="text-purple-600 hover:text-pink-600 font-medium">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
