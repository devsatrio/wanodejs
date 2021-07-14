const sequelize=require("sequelize");
const db = require("../config/db");
// const bcrypt=require("bcryptjs");

const contact=db.define(
    "tb_contact"
    , {
      nama:{type:sequelize.STRING},
      telp:{type:sequelize.STRING},
      no_rm:{type:sequelize.STRING},
      deskripsi:{type:sequelize.STRING},
    },
    {
        freezeTableName:true,
    }
    );
  
module.exports=contact;