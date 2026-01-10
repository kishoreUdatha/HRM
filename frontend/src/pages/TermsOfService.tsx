import React from 'react';
import { Link } from 'react-router-dom';
import { HiArrowLeft, HiDocumentText } from 'react-icons/hi';

const TermsOfService: React.FC = () => {
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
              <HiDocumentText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black">Terms of Service</h1>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms of Service ("Terms") constitute a legally binding agreement between you (either an
              individual or an entity, referred to as "you," "your," or "Customer") and HRZIO ("we," "us," "our,"
              or "Company") governing your access to and use of the HRZIO Human Resource Management platform,
              including any associated mobile applications, websites, and services (collectively, the "Service").
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              By accessing or using our Service, you agree to be bound by these Terms. If you disagree with
              any part of these Terms, you may not access the Service. If you are entering into these Terms
              on behalf of an organization, you represent and warrant that you have the authority to bind
              that organization to these Terms.
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              HRZIO provides a cloud-based Human Resource Management System (HRMS) that includes, but is not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
              <li>Core HR management and employee database</li>
              <li>Attendance and time tracking with GPS and facial recognition</li>
              <li>Leave and absence management</li>
              <li>Payroll processing and salary management</li>
              <li>Recruitment and applicant tracking</li>
              <li>Performance management and reviews</li>
              <li>Employee self-service portal</li>
              <li>Reporting and analytics</li>
              <li>Mobile applications for iOS and Android</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time,
              with reasonable notice when possible.
            </p>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Registration and Security</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.1 Account Creation</h3>
            <p className="text-gray-600 leading-relaxed">
              To use the Service, you must create an organization account and provide accurate, complete,
              and current information. You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your account.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.2 Account Security</h3>
            <p className="text-gray-600 leading-relaxed">
              You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-2">
              <li>Use strong, unique passwords for your account</li>
              <li>Enable multi-factor authentication when available</li>
              <li>Notify us immediately of any unauthorized access or security breach</li>
              <li>Not share your account credentials with unauthorized parties</li>
              <li>Ensure that user access is appropriately managed within your organization</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.3 Account Administrators</h3>
            <p className="text-gray-600 leading-relaxed">
              Your organization must designate at least one administrator who will be responsible for
              managing user accounts, permissions, and organizational settings within the Service.
            </p>
          </section>

          {/* Subscription and Payment */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscription and Payment</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4.1 Subscription Plans</h3>
            <p className="text-gray-600 leading-relaxed">
              The Service is offered through various subscription plans with different features and pricing.
              Details of available plans are provided on our website. We reserve the right to modify pricing
              with 30 days' notice before the next billing cycle.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4.2 Free Trial</h3>
            <p className="text-gray-600 leading-relaxed">
              We may offer a free trial period for new customers. At the end of the trial, your account
              will be converted to a paid subscription unless you cancel. No refunds are provided for
              partial billing periods.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4.3 Payment Terms</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable except as expressly stated</li>
              <li>You are responsible for all applicable taxes</li>
              <li>Failed payments may result in suspension of service</li>
              <li>We may use third-party payment processors to handle transactions</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4.4 Price Changes</h3>
            <p className="text-gray-600 leading-relaxed">
              We may change subscription fees upon 30 days' notice. Continued use of the Service after
              price changes constitutes acceptance of the new pricing.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Acceptable Use Policy</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              You agree to use the Service only for lawful purposes and in accordance with these Terms.
              You shall not:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Upload or transmit viruses, malware, or other malicious code</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Use the Service to send spam or unsolicited communications</li>
              <li>Impersonate any person or entity</li>
              <li>Collect or harvest user data without authorization</li>
              <li>Use the Service in a manner that could damage our reputation</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          {/* Data and Content */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data and Content</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">6.1 Your Data</h3>
            <p className="text-gray-600 leading-relaxed">
              You retain all rights to the data you submit to the Service ("Customer Data"). You grant us
              a limited license to use, process, and store Customer Data solely for the purpose of providing
              and improving the Service.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">6.2 Data Responsibilities</h3>
            <p className="text-gray-600 leading-relaxed">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-2">
              <li>The accuracy and legality of Customer Data</li>
              <li>Obtaining necessary consents from employees and data subjects</li>
              <li>Complying with applicable data protection laws</li>
              <li>Maintaining appropriate backups of your data</li>
              <li>Configuring appropriate access controls within your organization</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">6.3 Data Export</h3>
            <p className="text-gray-600 leading-relaxed">
              You may export your Customer Data at any time during your subscription. Upon termination,
              you will have a reasonable period (typically 30 days) to export your data before it is deleted.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">7.1 Our Intellectual Property</h3>
            <p className="text-gray-600 leading-relaxed">
              The Service, including its original content, features, functionality, design, and branding,
              is owned by HRZIO and protected by copyright, trademark, and other intellectual property laws.
              Nothing in these Terms grants you any right to use our trademarks, logos, or branding without
              prior written consent.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">7.2 License to Use</h3>
            <p className="text-gray-600 leading-relaxed">
              Subject to these Terms, we grant you a limited, non-exclusive, non-transferable license to
              access and use the Service for your internal business purposes during your subscription period.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">7.3 Feedback</h3>
            <p className="text-gray-600 leading-relaxed">
              If you provide us with feedback or suggestions regarding the Service, you grant us an
              unrestricted license to use such feedback without compensation or attribution.
            </p>
          </section>

          {/* Confidentiality */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Confidentiality</h2>
            <p className="text-gray-600 leading-relaxed">
              Both parties agree to maintain the confidentiality of any proprietary or confidential
              information disclosed during the use of the Service. This includes, but is not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
              <li>Business strategies and plans</li>
              <li>Technical information and documentation</li>
              <li>Employee and customer data</li>
              <li>Pricing and financial information</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              Confidentiality obligations do not apply to information that is publicly available, independently
              developed, or rightfully obtained from third parties.
            </p>
          </section>

          {/* Service Level */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Service Level and Support</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">9.1 Availability</h3>
            <p className="text-gray-600 leading-relaxed">
              We strive to maintain 99.9% service availability. Scheduled maintenance will be performed
              during low-usage periods with advance notice when possible. We are not liable for any
              downtime resulting from circumstances beyond our reasonable control.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">9.2 Support</h3>
            <p className="text-gray-600 leading-relaxed">
              We provide customer support according to your subscription plan. Support channels and
              response times vary by plan level. Enterprise customers may have access to dedicated
              support and service level agreements (SLAs).
            </p>
          </section>

          {/* Warranty Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Warranty Disclaimer</h2>
            <p className="text-gray-600 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              We do not warrant that the Service will be uninterrupted, error-free, or completely secure.
              We do not warrant that the Service will meet your specific requirements or expectations.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, HRZIO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
              DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE USE OF THE SERVICE.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICE
              SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Indemnification</h2>
            <p className="text-gray-600 leading-relaxed">
              You agree to indemnify, defend, and hold harmless HRZIO and its officers, directors, employees,
              agents, and affiliates from and against any claims, damages, losses, liabilities, costs, and
              expenses (including reasonable attorneys' fees) arising out of or related to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your Customer Data or content</li>
              <li>Your violation of applicable laws or regulations</li>
            </ul>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Termination</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">13.1 Termination by You</h3>
            <p className="text-gray-600 leading-relaxed">
              You may terminate your subscription at any time through your account settings or by
              contacting our support team. Termination will be effective at the end of your current
              billing period. No refunds are provided for partial periods.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">13.2 Termination by Us</h3>
            <p className="text-gray-600 leading-relaxed">
              We may suspend or terminate your access to the Service immediately if:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-2">
              <li>You breach these Terms</li>
              <li>You fail to pay applicable fees</li>
              <li>Your use poses a security risk</li>
              <li>We are required to do so by law</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">13.3 Effect of Termination</h3>
            <p className="text-gray-600 leading-relaxed">
              Upon termination, your right to use the Service ceases immediately. We will provide a
              reasonable period for data export. Provisions that by their nature should survive
              termination will remain in effect.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Governing Law and Disputes</h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India,
              without regard to its conflict of law provisions. Any disputes arising from these Terms
              or the Service shall be resolved through:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
              <li>Good faith negotiations between the parties</li>
              <li>Mediation, if negotiations fail</li>
              <li>Binding arbitration or litigation in the courts of [Your Jurisdiction]</li>
            </ul>
          </section>

          {/* General Provisions */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. General Provisions</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">15.1 Entire Agreement</h3>
            <p className="text-gray-600 leading-relaxed">
              These Terms, together with the Privacy Policy and any other agreements referenced herein,
              constitute the entire agreement between you and HRZIO regarding the Service.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">15.2 Severability</h3>
            <p className="text-gray-600 leading-relaxed">
              If any provision of these Terms is found to be unenforceable, the remaining provisions
              will continue in full force and effect.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">15.3 Waiver</h3>
            <p className="text-gray-600 leading-relaxed">
              Our failure to enforce any right or provision of these Terms shall not be deemed a waiver
              of such right or provision.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">15.4 Assignment</h3>
            <p className="text-gray-600 leading-relaxed">
              You may not assign or transfer these Terms without our prior written consent. We may
              assign these Terms without restriction.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">15.5 Notices</h3>
            <p className="text-gray-600 leading-relaxed">
              We may provide notices to you via email, in-app notifications, or posting on our website.
              You may contact us through the channels provided below.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will provide notice of material
              changes via email or through the Service. Your continued use of the Service after such
              changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Contact Information</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="mt-4 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
              <p className="text-gray-700"><strong>HRZIO Legal Team</strong></p>
              <p className="text-gray-600 mt-2">Email: legal@hrzio.com</p>
              <p className="text-gray-600">Support: support@hrzio.com</p>
              <p className="text-gray-600">Address: [Your Business Address]</p>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-gray-500">
            See also: <Link to="/privacy" className="text-purple-600 hover:text-pink-600 font-medium">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
