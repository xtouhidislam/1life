// Metadata only; books remain on their publishers' sites. Counts include PDF covers/front matter.
export const bookSuggestions = [
 {title:'The Forty Hadith of al-Imam an-Nawawi',author:'Yahya ibn Sharaf an-Nawawi; explanatory notes by Umm Muhammad',total_pages:107,source_url:'https://d1.islamhouse.com/data/en/ih_books/single2/en-hadith-nawawy-sahih.pdf'},
 {title:'Hisn Al-Muslim (Fortress of the Muslim)',author:'Saeed ibn Ali ibn Wahf al-Qahtani',total_pages:159,source_url:'https://d1.islamhouse.com/data/en/ih_books/single/risala_en_hisnulmuslim.pdf'},
 {title:'Useful Ways of Leading a Happy Life',author:'Abdur-Rahman ibn Nasir as-Sadi',total_pages:40,source_url:'https://d1.islamhouse.com/data/en/ih_books/single2/en_useful_way_of_leading_happy_life.pdf'},
 {title:'The Three Fundamental Principles of Islam and Their Proofs',author:'Muhammad ibn Abdul-Wahhab',total_pages:30,source_url:'https://d1.islamhouse.com/data/en/ih_books/single/en-the-fundamentals-of-islam.pdf'},
 {title:'What Every Muslim Must Know about Purification',author:'Abdul Rahman Abdul Karim Al-Sheha',total_pages:103,source_url:'https://d1.islamhouse.com/data/en/ih_books/single/en_What_Every_Muslim_Must_Know_about_Purification.pdf'},
 {title:'A Brief Illustrated Guide to Understanding Islam',author:'I. A. Ibrahim',total_pages:80,source_url:'https://www.islam-guide.com/islam-guide.pdf'},
].map(book=>({...book,notes:'English PDF edition. Page total includes covers and front matter, checked 31 October 2026. Adjust the total if you read a different edition.'}));
