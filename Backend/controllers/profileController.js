const pool = require("../db");


const getPerson = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        a.house_num,
        a.street_name,
        a.landmark,
        a.region_id,
        r.region_name,
        r.postal_code
      FROM person p
      JOIN address a ON p.address_id = a.address_id
      JOIN region r ON a.region_id = r.region_id
      WHERE person_id = $1
    `, [req.user.person_id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch person details' });
  }
}

const updateProfile = async (req, res) => {
  const { first_name, last_name, phone_number, gender } = req.body;
  if (!first_name || !last_name || !phone_number) {
    return res.status(400).json({ error: 'first_name, last_name and phone_number are required' });
  }
  try {
    await pool.query(
      `UPDATE person SET first_name=$1, last_name=$2, phone_number=$3, gender=$4 WHERE person_id=$5`,
      [first_name, last_name, phone_number, gender || null, req.user.person_id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const updateAvatar = async (req, res) => {
  const { avatar_url } = req.body;
  if (!avatar_url) return res.status(400).json({ error: 'avatar_url is required' });
  // if (avatar_url.length > 2800000) return res.status(400).json({ error: 'Image too large. Max 2MB.' });
  try {
    await pool.query(
      `UPDATE account SET avatar_url = $1 WHERE person_id = $2 AND account_type ILIKE $3`,
      [avatar_url, req.user.person_id, req.user.role]
    );
    res.json({ message: 'Avatar updated', avatar_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
};

const deleteAvatar = async (req, res) => {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  try {
    const result = await pool.query(
      `SELECT avatar_url FROM account WHERE person_id = $1 AND account_type ILIKE $2`,
      [req.user.person_id, req.user.role]
    );
    const currentUrl = result.rows[0]?.avatar_url;
    if (currentUrl && currentUrl.includes('cloudinary.com')) {
      const match = currentUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z]+$/i);
      if (match) {
        await cloudinary.uploader.destroy(match[1]).catch(err =>
          console.warn('Cloudinary delete warning:', err.message)
        );
      }
    }
    await pool.query(
      `UPDATE account SET avatar_url = NULL WHERE person_id = $1 AND account_type ILIKE $2`,
      [req.user.person_id, req.user.role]
    );
    res.json({ message: 'Avatar removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
}

const updatePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const result = await pool.query(
      `SELECT password_hashed FROM account WHERE person_id = $1 AND account_type ILIKE $2`,
      [req.user.person_id, req.user.role]
    );
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hashed);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query(
      `UPDATE account SET password_hashed = $1 WHERE person_id = $2 AND account_type ILIKE $3`,
      [hashed, req.user.person_id, req.user.role]
    );
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
};


module.exports = {
  getPerson,
  updateProfile,
  updateAvatar,
  deleteAvatar,
  updatePassword
};