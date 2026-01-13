import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

function BookingForm({ token }) {
  const [symptoms, setSymptoms] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);

  const [loadingPredict, setLoadingPredict] = useState(false);
  const [loadingBook, setLoadingBook] = useState(false);
  const [message, setMessage] = useState('');

  const authHeader = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // 🔹 Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    let hour = 9;
    let minute = 0;
    while (hour < 17) {
      slots.push(
        `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      );
      minute += 5;
      if (minute === 60) {
        minute = 0;
        hour++;
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // 🔹 Fetch past appointments
  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line
  }, []);

  const fetchAppointments = async () => {
    if (!token) return;
    try {
      const response = await axios.get(
        'http://localhost:5000/appointments',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.error(
        'Fetch appointments error:',
        error.response?.data || error.message
      );
    }
  };


  // 🔹 Fetch booked slots
  useEffect(() => {
    if (selectedDoctor && date) {
      axios.get('http://localhost:5000/booked_slots', {
        params: { doctor: selectedDoctor, date }
      })
      .then(res => setBookedSlots(res.data.booked_slots || []))
      .catch(err => console.error(err));
    }
  }, [selectedDoctor, date]);

  // 🔹 Predict
  const handlePredict = async () => {
    setLoadingPredict(true);
    try {
      const res = await axios.post('http://localhost:5000/predict', { symptoms });
      setPrediction(res.data);
      setSelectedDoctor(res.data.doctors[0]);

      Swal.fire({
        icon: 'success',
        title: 'Prediction Complete',
        text: 'Disease and department predicted successfully!'
      });

    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Prediction Failed',
        text: 'Unable to predict disease. Try again.'
      });
    } finally {
      setLoadingPredict(false);
    }
  };

  // 🔹 Book appointment
  const handleBooking = async () => {
    setLoadingBook(true);
    try {
      const res = await axios.post(
        'http://localhost:5000/book_appointment',
        {
          disease: prediction.disease,
          department: prediction.department,
          doctor: selectedDoctor,
          date,
          time_slot: timeSlot
        },
        authHeader
      );

      Swal.fire({
        icon: 'success',
        title: 'Appointment Booked',
        text: res.data.message
      });

      setTimeSlot('');
      fetchAppointments();

    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Booking Failed',
        text: err.response?.data?.message || 'Please try again.'
      });
    } finally {
      setLoadingBook(false);
    }
  };
  const handleCancel = async (id) => {
    try {
      await axios.delete(
        `http://localhost:5000/cancel_appointment/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setMessage('Appointment cancelled successfully');
      fetchAppointments();
    } catch (error) {
      console.error('Cancel error:', error);
      setMessage('Failed to cancel appointment');
    }
  };


  return (
    <div className="card">
      <h3>Describe Symptoms</h3>

      <textarea
        rows="4"
        placeholder="Describe your symptoms..."
        value={symptoms}
        onChange={e => setSymptoms(e.target.value)}
      />

      <button
        className="btn btn-primary"
        onClick={handlePredict}
        disabled={loadingPredict || !symptoms}
      >
        {loadingPredict ? 'Predicting...' : 'Predict'}
      </button>

      {prediction && (
        <div className="card">
          <p><strong>Disease:</strong> {prediction.disease}</p>
          <p><strong>Department:</strong> {prediction.department}</p>

          <label>Doctor</label>
          <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}>
            {prediction.doctors.map(doc => (
              <option key={doc} value={doc}>{doc}</option>
            ))}
          </select>

          <label>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />

          <label>Time Slot</label>
          <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)}>
            <option value="">Select time</option>
            {timeSlots.map(slot => (
              <option
                key={slot}
                value={slot}
                disabled={bookedSlots.includes(slot)}
              >
                {slot} {bookedSlots.includes(slot) ? '(Booked)' : ''}
              </option>
            ))}
          </select>

          <button
            className="btn btn-success"
            onClick={handleBooking}
            disabled={loadingBook || !date || !timeSlot}
          >
            {loadingBook ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>
      )}

      <hr />

      <h3>Past Appointments</h3>
      <div className="appointment-grid">
        {appointments.length === 0 ? (
          <p style={{ color: '#777' }}>No past appointments found.</p>
        ) : (
          appointments.map((appt) => (
            <div className="appointment-card" key={appt.id}>
              <div className="appt-header">
                <span>{appt.date}</span>
                <span className="time">{appt.time_slot}</span>
              </div>
              <p><strong>Doctor:</strong> {appt.doctor}</p>
              <p><strong>Department:</strong> {appt.department}</p>
              <p><strong>Disease:</strong> {appt.disease}</p>
              <button
                className="btn-danger"
                onClick={() => handleCancel(appt.id)}
              >
                Cancel Appointment
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default BookingForm;
