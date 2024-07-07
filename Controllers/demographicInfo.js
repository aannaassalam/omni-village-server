const Demographic = require("../Models/demographicInfo");
const { ObjectId } = require("mongodb");

exports.add_demographic_info = async (req, res) => {
  const {
    marital_status,
    diet,
    height,
    weight,
    speaking,
    reading,
    writing,
    occupation,
    yearly_income,
    bank_account,
    savings_investment,
    chronic_diseases,
    handicap,
    mental_emotional,
    habits,
    education,
    education_seeking_to_gain,
    skillsets,
    hobbies,
    skills_seeking_to_learn,
    hobbies_seeking_to_adopt,
    aspiration,
    unfullfilled,
    wishes,
    status= 1
  } = req.body;
  const { user } = res.locals;
  try {
    const demographic_info = await Demographic.create({
      user_id: user._id,
      marital_status,
      diet,
      height,
      weight,
      speaking,
      reading,
      writing,
      occupation,
      yearly_income,
      bank_account,
      savings_investment,
      chronic_diseases,
      handicap,
      mental_emotional,
      habits,
      education,
      education_seeking_to_gain,
      skillsets,
      hobbies,
      skills_seeking_to_learn,
      hobbies_seeking_to_adopt,
      aspiration,
      unfullfilled,
      wishes,
      status
    });
    res.status(200).json({
      success: true,
      message: "Demographic information added successfully",
      data: demographic_info,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error while adding Demographic information",
      error: error,
    });
  }
};

exports.get_demographic_info_by_user_id = async (req, res) => {
   const { user } = res.locals;
  try {
    const data = await Demographic.findOne({ user_id: user._id });
    res.status(200).json({
      success: true,
      message: "Info got successfully",
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error while getting Demographic information by userid",
      error: error,
    });
  }
};

exports.update_demographic_info_by_user_id = async (req, res) => {
  const {
    marital_status,
    diet,
    height,
    weight,
    speaking,
    reading,
    writing,
    occupation,
    yearly_income,
    bank_account,
    savings_investment,
    chronic_diseases,
    handicap,
    mental_emotional,
    habits,
    education,
    education_seeking_to_gain,
    skillsets,
    hobbies,
    skills_seeking_to_learn,
    hobbies_seeking_to_adopt,
    aspiration,
    unfullfilled,
    wishes,
    status=1
  } = req.body;
  const {user} = res.locals
  try {
    const data = await Demographic.findOneAndUpdate(
      { user_id: user._id },
      {
        $set: {
          marital_status: marital_status,
          diet,
          height,
          weight,
          speaking,
          reading,
          writing,
          occupation,
          yearly_income,
          bank_account,
          savings_investment,
          chronic_diseases,
          handicap,
          mental_emotional,
          habits,
          education,
          education_seeking_to_gain,
          skillsets,
          hobbies,
          skills_seeking_to_learn,
          hobbies_seeking_to_adopt,
          aspiration,
          unfullfilled,
          wishes,
          status
        },
      },
      { new: true, runValidators: true }
    );
    res.status(200).json({
      success: true,
      message: "Info updated successfully",
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error while updating Demographic information by userid",
      error: error,
    });
  }
};

exports.delete_demographic_info_by_user_id = async(req,res) =>{
    const { user } = res.locals;
  try {
    const data = await Demographic.findOneAndDelete({ user_id: user._id });
    res.status(200).json({
      success: true,
      message: "Info deleted successfully",
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error while deleting Demographic information by userid",
      error: error,
    });
  }
}
